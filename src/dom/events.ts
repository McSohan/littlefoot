import { throttle } from '@pacote/throttle'
import type { FootnoteAction, UseCases } from '../use-cases'

const SELECTOR_FOOTNOTE = '[data-footnote-id]'

// Finds the closest ancestor of the event target that matches a given selector.
const closestTarget = (event: Event, selector: string) =>
  (event.target as HTMLElement).closest<HTMLElement>(selector)

// Retrieves the data-footnote-id attribute from an HTML element.
const getFootnoteId = (element: HTMLElement | null) =>
  element?.dataset.footnoteId

// Handles hover events for footnotes. When the user hovers over a footnote element, 
// it triggers the provided action (such as showing or hiding the footnote).
const hoverHandler = (action: FootnoteAction) => (event: Event) => {
  event.preventDefault()
  const element = closestTarget(event, SELECTOR_FOOTNOTE)
  const id = getFootnoteId(element)
  if (id) {
    action(id)
  }
}

const onDocument = document.addEventListener
const onWindow = window.addEventListener

// Delegates an event listener to a specific selector. The event listener is 
// attached to the document, but it only triggers if the event's target matches the given selector.
const delegate = (
  eventType: string,
  selector: string,
  listener: EventListener,
  options?: AddEventListenerOptions,
) =>
  onDocument(
    eventType,
    (event) => {
      const target = event.target as Element | null
      if (target?.closest(selector)) {
        listener.call(target, event)
      }
    },
    options,
  )

// Adds various event listeners to manage user interactions with footnotes (touch, click, hover, scroll, resize, etc.). 
// Throttling is applied to the scroll and resize event handlers for performance optimization.
export function addListeners(useCases: UseCases): () => void {
  const toggleOnTouch = (event: Event) => {
    const element = closestTarget(event, '[data-footnote-button]')
    const id = getFootnoteId(element)
    if (id) {
      event.preventDefault()
      useCases.toggle(id)
    } else if (!closestTarget(event, '[data-footnote-popover]')) {
      useCases.touchOutside()
    }
  }
  const dismissOnEscape = (event: KeyboardEvent) => {
    if (event.keyCode === 27 || event.key === 'Escape' || event.key === 'Esc') {
      useCases.dismissAll()
    }
  }
  const throttledReposition = throttle(useCases.repositionAll, 16)
  const throttledResize = throttle(useCases.resizeAll, 16)
  const showOnHover = hoverHandler(useCases.hover)
  const hideOnHover = hoverHandler(useCases.unhover)

  const controller = new AbortController()
  const options = { signal: controller.signal }

  onDocument('touchend', toggleOnTouch, options)
  onDocument('click', toggleOnTouch, options)
  onDocument('keyup', dismissOnEscape, options)
  onDocument('gestureend', throttledReposition, options)
  onWindow('scroll', throttledReposition, options)
  onWindow('resize', throttledResize, options)
  delegate('mouseover', SELECTOR_FOOTNOTE, showOnHover, options)
  delegate('mouseout', SELECTOR_FOOTNOTE, hideOnHover, options)

  return () => {
    controller.abort()
  }
}
