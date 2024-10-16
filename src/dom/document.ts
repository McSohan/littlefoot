import type { Adapter } from '../use-cases'
import { addClass, removeClass } from './element'
import { type FootnoteElements, footnoteActions } from './footnote'
import { bindScrollHandler } from './scroll'

export const CLASS_CONTENT = 'littlefoot__content'
export const CLASS_WRAPPER = 'littlefoot__wrapper'

export type HTMLAdapterSettings = Readonly<{
  allowDuplicates: boolean
  anchorParentSelector: string
  anchorPattern: RegExp
  buttonTemplate: string
  contentTemplate: string
  footnoteSelector: string
  numberResetSelector: string
  scope: string
}>

type TemplateValues = Readonly<{
  number: number
  id: string
  content: string
  reference: string
}>

const CLASS_PRINT_ONLY = 'littlefoot--print'

// Adds the print-only class to a set of elements, making them visible only when the page is printed.
const setAllPrintOnly = (...elements: readonly Element[]) =>
  elements.forEach((e) => addClass(e, CLASS_PRINT_ONLY))

// Queries all matching elements within a parent node based on a CSS selector
function queryAll<E extends Element>(
  parent: ParentNode,
  selector: string,
): readonly E[] {
  return Array.from(parent.querySelectorAll<E>(selector))
}

// Finds an element by class name within a given element or returns the first child if no class match is found.
function getByClassName<E extends Element>(element: E, className: string): E {
  return (
    element.querySelector<E>('.' + className) ||
    (element.firstElementChild as E | null) ||
    element
  )
}

// Creates an HTML element
function createElementFromHTML(html: string): HTMLElement {
  const container = document.createElement('div')
  container.innerHTML = html
  const element = container.firstElementChild as HTMLElement
  element.remove()
  return element
}

// Checks whether a value is defined
function isDefined<T>(value?: T): value is T {
  return value !== undefined
}

// Finds all footnote links within a document that match the given pattern.
function findFootnoteLinks(
  document: Document,
  pattern: RegExp,
  scope: string,
): readonly HTMLAnchorElement[] {
  return queryAll<HTMLAnchorElement>(document, scope + ' a[href*="#"]').filter(
    (link) => (link.href + link.rel).match(pattern),
  )
}

// Finds the reference element associated with a footnote link, based on the footnote's ID in the URL fragment.
function findReference<E extends Element>(
  document: Document,
  allowDuplicates: boolean,
  anchorParentSelector: string,
  footnoteSelector: string,
) {
  const processed: E[] = []
  return (link: HTMLAnchorElement): [string, Element, E] | undefined => {
    const fragment = link.href.split('#')[1]
    if (!fragment) return

    const body = queryAll<E>(document, '#' + window.CSS.escape(fragment))
      .find((footnote) => allowDuplicates || !processed.includes(footnote))
      ?.closest<E>(footnoteSelector)
    if (!body) return

    processed.push(body)
    const reference = link.closest<E>(anchorParentSelector) || link
    return [reference.id || link.id, reference, body]
  }
}

// Recursively hides footnote containers if they only contain print-only elements.
function recursiveHideFootnoteContainer(element: Element): void {
  // biome-ignore lint/style/noNonNullAssertion: <explanation>
  const container = element.parentElement!
  const visibleElements = queryAll(
    container,
    ':scope > :not(.' + CLASS_PRINT_ONLY + ')',
  )
  const visibleSeparators = visibleElements.filter((el) => el.tagName === 'HR')

  if (visibleElements.length === visibleSeparators.length) {
    setAllPrintOnly(...visibleSeparators.concat(container))
    recursiveHideFootnoteContainer(container)
  }
}

// Recursively removes an element and its ancestors until the stopElement is reached.
function recursiveUnmount(element: Element, stopElement: Element) {
  const parent = element.parentElement
  element.remove()
  if (
    parent &&
    parent !== stopElement &&
    !parent.innerHTML.replace(/(\[\]|&nbsp;|\s)/g, '')
  ) {
    recursiveUnmount(parent, stopElement)
  }
}

// Prepares template data for rendering a footnote, including removing backlinks from the content and formatting the HTML.
function prepareTemplateData<E extends Element>(
  [id, reference, body]: [string, E, E],
  index: number,
): [E, E, TemplateValues] {
  const content = createElementFromHTML(body.outerHTML)
  const backlinkSelector = '[href$="#' + id + '"]'
  queryAll<E>(content, backlinkSelector).forEach((bl) =>
    recursiveUnmount(bl, content),
  )
  const html = content.innerHTML.trim()

  return [
    reference,
    body,
    {
      id: String(index + 1),
      number: index + 1,
      reference: 'lf-' + id,
      content: html.startsWith('<') ? html : '<p>' + html + '</p>',
    },
  ]
}

// Resets the numbering of footnotes based on a reset selector.
function resetNumbers<E extends Element>(resetSelector: string) {
  let number = 0
  let previousParent: E | null = null
  return ([reference, body, values]: [E, E, TemplateValues]): [
    E,
    E,
    TemplateValues,
  ] => {
    const parent = reference.closest<E>(resetSelector)
    number = previousParent === parent ? number + 1 : 1
    previousParent = parent
    return [reference, body, { ...values, number }]
  }
}

// Creates a function that interpolates a string template with values from a
function interpolate(template: string) {
  return (replacement: TemplateValues) =>
    template.replace(/<%=?\s*(\w+?)\s*%>/g, (_, key: keyof TemplateValues) =>
      String(replacement[key] ?? ''),
    )
}

// Creates button and popover elements for footnotes using provided templates.
function createElements<E extends Element>(
  buttonTemplate: string,
  popoverTemplate: string,
) {
  const renderButton = interpolate(buttonTemplate)
  const renderPopover = interpolate(popoverTemplate)

  return ([reference, values]: [E, TemplateValues]): FootnoteElements => {
    const id = values.id

    const host = createElementFromHTML(
      '<span class="littlefoot">' + renderButton(values) + '</span>',
    )

    const button = host.firstElementChild as HTMLElement
    button.setAttribute('aria-expanded', 'false')
    button.dataset.footnoteButton = ''
    button.dataset.footnoteId = id

    const popover = createElementFromHTML(renderPopover(values))
    popover.dataset.footnotePopover = ''
    popover.dataset.footnoteId = id

    const wrapper = getByClassName(popover, CLASS_WRAPPER)
    const content = getByClassName(popover, CLASS_CONTENT)
    bindScrollHandler(content, popover)

    reference.insertAdjacentElement('beforebegin', host)

    return { id, button, host, popover, content, wrapper }
  }
}

// Initializes the footnote adapter with the provided settings, finds footnote 
// links in the document, processes them, and sets up the required HTML elements for the footnotes.
export function setup({
  allowDuplicates,
  anchorParentSelector,
  anchorPattern,
  buttonTemplate,
  contentTemplate,
  footnoteSelector,
  numberResetSelector,
  scope,
}: HTMLAdapterSettings): Adapter<HTMLElement> {
  const footnotes = findFootnoteLinks(document, anchorPattern, scope)
    .map(
      findReference(
        document,
        allowDuplicates,
        anchorParentSelector,
        footnoteSelector,
      ),
    )
    .filter(isDefined)
    .map(prepareTemplateData)
    .map(numberResetSelector ? resetNumbers(numberResetSelector) : (i) => i)
    .map<[Element, TemplateValues]>(([reference, body, values]) => {
      setAllPrintOnly(reference, body)
      recursiveHideFootnoteContainer(body)
      return [reference, values]
    })
    .map(createElements(buttonTemplate, contentTemplate))
    .map(footnoteActions)

  return {
    footnotes,

    unmount() {
      footnotes.forEach((footnote) => footnote.destroy())
      queryAll(document, '.' + CLASS_PRINT_ONLY).forEach((element) =>
        removeClass(element, CLASS_PRINT_ONLY),
      )
    },
  }
}
