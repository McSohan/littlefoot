// Adds a specified class to the given element's class list.
export function addClass(element: Element, className: string): void {
  element.classList.add(className)
}

// Removes a specified class from the given element's class list.
export function removeClass(element: Element, className: string): void {
  element.classList.remove(className)
}

// Checks if the specified class exists in the given element's class list.
export function hasClass(element: Element, className: string): boolean {
  return element.classList.contains(className)
}
