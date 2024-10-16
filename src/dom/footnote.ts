import type { Footnote } from '../use-cases'
import { addClass, hasClass, removeClass } from './element'
import {
  type Position,
  getLeftInPixels,
  getMaxHeight,
  repositionPopover,
  repositionTooltip,
} from './layout'

const CLASS_ACTIVE = 'is-active'
const CLASS_CHANGING = 'is-changing'
const CLASS_SCROLLABLE = 'is-scrollable'

export type FootnoteElements = Readonly<{
  id: string
  host: HTMLElement
  button: HTMLElement
  popover: HTMLElement
  content: HTMLElement
  wrapper: HTMLElement
}>

// Returns an object containing various methods to manage a footnote's lifecycle. It handles actions 
// such as activating, dismissing, repositioning, resizing, and destroying the footnote.
export function footnoteActions({
  id,
  button,
  content,
  host,
  popover,
  wrapper,
}: FootnoteElements): Footnote<HTMLElement> {
  let maxHeight = 0
  let position: Position = 'above'

  const isMounted = () => document.body.contains(popover)

  return {
    id,

    // Activates the footnote by displaying the popover, adding the appropriate CSS classes, 
    // and setting the aria-expanded attribute to true.
    activate: (onActivate) => {
      button.setAttribute('aria-expanded', 'true')
      addClass(button, CLASS_CHANGING)
      addClass(button, CLASS_ACTIVE)
      button.insertAdjacentElement('afterend', popover)
      popover.style.maxWidth = document.body.clientWidth + 'px'
      maxHeight = getMaxHeight(content)
      onActivate?.(popover, button)
    },

    // Dismisses the footnote by hiding the popover and removing the active state from the button.
    dismiss: (onDismiss) => {
      button.setAttribute('aria-expanded', 'false')
      addClass(button, CLASS_CHANGING)
      removeClass(button, CLASS_ACTIVE)
      removeClass(popover, CLASS_ACTIVE)
      onDismiss?.(popover, button)
    },

    // Checks if the footnote is currently active
    isActive: () => hasClass(button, CLASS_ACTIVE),

    // Checks if the footnote is ready for interaction
    isReady: () => !hasClass(button, CLASS_CHANGING),

    // Marks the footnote as ready by adding CLASS_ACTIVE to the 
    // popover and removing CLASS_CHANGING from the button.
    ready: () => {
      addClass(popover, CLASS_ACTIVE)
      removeClass(button, CLASS_CHANGING)
    },

    // Removes the footnote popover from the DOM and clears the CLASS_CHANGING class from the button.
    remove: () => {
      popover.remove()
      removeClass(button, CLASS_CHANGING)
    },

    // Repositions the popover relative to the button based on the available screen space.
    reposition: () => {
      if (isMounted()) {
        const [next, height] = repositionPopover(popover, button, position)
        position = next
        content.style.maxHeight = Math.min(maxHeight, height) + 'px'

        if (popover.offsetHeight < content.scrollHeight) {
          addClass(popover, CLASS_SCROLLABLE)
          content.setAttribute('tabindex', '0')
        } else {
          removeClass(popover, CLASS_SCROLLABLE)
          content.removeAttribute('tabindex')
        }
      }
    },

    // Adjusts the popover's size based on the current window dimensions.
    resize: () => {
      if (isMounted()) {
        popover.style.left = getLeftInPixels(content, button) + 'px'
        wrapper.style.maxWidth = content.offsetWidth + 'px'
        repositionTooltip(popover, button)
      }
    },

    // Destroys the footnote by removing the host element from the DOM.
    destroy: () => host.remove(),
  }
}
