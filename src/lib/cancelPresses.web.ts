// Browsers have no native gesture system to cancel a press when a swipe
// starts. The page moves with the pointer, so the button under it is still
// there when the pointer lifts and the browser fires a click. Swallow that
// one click (it arrives right after the swipe's pointerup).
let armed = false;

function swallow(e: Event) {
  e.stopPropagation();
  e.preventDefault();
  disarm();
}

function disarm() {
  if (!armed) return;
  armed = false;
  window.removeEventListener('click', swallow, true);
}

export function cancelPresses(): void {
  if (typeof window === 'undefined' || armed) return;
  armed = true;
  window.addEventListener('click', swallow, true);
  // If no click follows (pointer lifted off the button), stop listening
  // shortly after the pointer is released.
  window.addEventListener(
    'pointerup',
    () => {
      setTimeout(disarm, 50);
    },
    { once: true, capture: true },
  );
}
