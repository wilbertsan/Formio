import '@testing-library/jest-dom/vitest'

const mockMatchMedia = (query: string): MediaQueryList => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  addListener: () => undefined,
  removeListener: () => undefined,
  dispatchEvent: () => false,
})

window.matchMedia = mockMatchMedia

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver

HTMLElement.prototype.setPointerCapture = function () {}
HTMLElement.prototype.hasPointerCapture = function () { return false }
