//
// Scrolls inside the commit explorer only, so moving the selection or opening a pane never
// scrolls the page around the explorer.
//

//
// Scrolls `container` up or down by the least amount that shows the whole of `element`, which sits
// inside it. Leaves it where it is when the element is already in view.
//
export function scrollIntoViewVertically(container: HTMLElement, element: HTMLElement): void {
    const containerBox = container.getBoundingClientRect();
    const elementBox = element.getBoundingClientRect();
    if (elementBox.top < containerBox.top) {
        container.scrollTop -= containerBox.top - elementBox.top;
    }
    else if (elementBox.bottom > containerBox.bottom) {
        container.scrollTop += elementBox.bottom - containerBox.bottom;
    }
}

//
// Scrolls `container` sideways, smoothly, by the least amount that shows the whole of its last
// child, the pane opened last. Leaves it where it is when the pane is already in view.
//
export function scrollLastChildIntoView(container: HTMLElement): void {
    const last = container.lastElementChild;
    if (!(last instanceof HTMLElement)) {
        return;
    }
    const containerBox = container.getBoundingClientRect();
    const lastBox = last.getBoundingClientRect();
    const overflow = lastBox.right - containerBox.right;
    if (overflow > 0) {
        container.scrollBy({
            left: overflow + 1,
            behavior: "smooth",
        });
    }
}

//
// Scrolls the scrolling area of the pane that holds `element` so the element shows, as the keys
// move the selection through a pane's list.
//
export function scrollSelectionIntoView(element: HTMLElement | null): void {
    const container = element?.closest("[data-pane-scroll]");
    if (element && container instanceof HTMLElement) {
        scrollIntoViewVertically(container, element);
    }
}
