import { getStyle } from '@pacote/get-style'
import { pixels } from '@pacote/pixels'
import { addClass, removeClass } from './element'

export const CLASS_TOOLTIP = 'littlefoot__tooltip'

export type Position = 'above' | 'below'

// Computes the horizontal position of an element relative to the window width.
function getLeftRelative(element: HTMLElement): number {
  const marginLeft = Number.parseFloat(getStyle(element, 'marginLeft'))
  const width = element.offsetWidth - marginLeft
  const left = element.getBoundingClientRect().left + width / 2

  return left / window.innerWidth
}

// Calculates the left position in pixels for a popover relative to its associated button. 
export function getLeftInPixels(
  content: HTMLElement,
  button: HTMLElement,
): number {
  const maxWidth = content.offsetWidth
  const leftRelative = getLeftRelative(button)
  const buttonMarginLeft = Number.parseInt(getStyle(button, 'marginLeft'), 10)
  return -leftRelative * maxWidth + buttonMarginLeft + button.offsetWidth / 2
}

// Returns the maximum height of an element in pixels. 
export function getMaxHeight(element: HTMLElement) {
  return Math.round(pixels(getStyle(element, 'maxHeight'), element))
}

// Determines the best position ('above' or 'below') to display a popover relative to its 
// associated button, based on available screen space.
function getFootnotePosition(
  button: HTMLElement,
  popover: HTMLElement,
): [Position, number] {
  const marginSize = Number.parseInt(getStyle(popover, 'marginTop'), 10)
  const popoverHeight = 2 * marginSize + popover.offsetHeight
  const roomAbove = button.getBoundingClientRect().top + button.offsetHeight / 2
  const roomBelow = window.innerHeight - roomAbove

  return roomBelow >= popoverHeight || roomBelow >= roomAbove
    ? ['below', roomBelow - marginSize - 15]
    : ['above', roomAbove - marginSize - 15]
}

// Repositions the popover relative to the button based on available screen space.
export function repositionPopover(
  popover: HTMLElement,
  button: HTMLElement,
  current: Position,
): [Position, number] {
  const [next, room] = getFootnotePosition(button, popover)

  if (current !== next) {
    removeClass(popover, 'is-' + current)
    addClass(popover, 'is-' + next)
    const transformX = getLeftRelative(button) * 100 + '%'
    const transformY = next === 'above' ? '100%' : '0'
    popover.style.transformOrigin = transformX + ' ' + transformY
  }

  return [next, room]
}

// Repositions a tooltip element inside the popover based on the button's position.
export function repositionTooltip(
  popover: HTMLElement,
  button: HTMLElement,
): void {
  const tooltip = popover.querySelector<HTMLElement>('.' + CLASS_TOOLTIP)

  if (tooltip) {
    tooltip.style.left = getLeftRelative(button) * 100 + '%'
  }
}
