import { throttle } from '@pacote/throttle'
import { addClass, removeClass } from './element'

const CLASS_FULLY_SCROLLED = 'is-fully-scrolled'

// Returns an event handler function for handling the wheel event.
const scrollHandler = (popover: HTMLElement) => (event: WheelEvent) => {
  const content = event.currentTarget as HTMLElement | null
  const delta = -event.deltaY

  if (delta > 0) {
    removeClass(popover, CLASS_FULLY_SCROLLED)
  }

  if (
    content &&
    delta <= 0 &&
    delta < content.clientHeight + content.scrollTop - content.scrollHeight
  ) {
    addClass(popover, CLASS_FULLY_SCROLLED)
  }
}

// Binds a throttled scroll event handler to the content element of a popover.
export function bindScrollHandler(
  content: HTMLElement,
  popover: HTMLElement,
): void {
  content.addEventListener('wheel', throttle(scrollHandler(popover), 16))
}
