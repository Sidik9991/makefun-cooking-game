// Ember Pass Kitchen — keyboard and mouse, nothing else.
// One job: turn keys and clicks into the few things main.js acts on.

export const ACTION_INTERACT = 1;
export const ACTION_TRASH = 2;
export const ACTION_MUTE = 4;
export const ACTION_HELP = 8;
export const ACTION_PAUSE = 16;
export const ACTION_CONFIRM = 32;

/** Create the input state for a canvas: keys held, clicks queued, hover point. */
export function createInput(canvas) {
  const keys = new Set();
  const actions = { bits: 0 };
  const clicks = [];
  let hover = { x: -1, y: -1 };

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 1280,
      y: ((event.clientY - rect.top) / rect.height) * 720,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'KeyE' || event.code === 'Space') actions.bits |= ACTION_INTERACT;
    if (event.code === 'KeyQ') actions.bits |= ACTION_TRASH;
    if (event.code === 'KeyM') actions.bits |= ACTION_MUTE;
    if (event.code === 'KeyH') actions.bits |= ACTION_HELP;
    if (event.code === 'KeyP' || event.code === 'Escape') actions.bits |= ACTION_PAUSE;
    if (event.code === 'Enter') actions.bits |= ACTION_CONFIRM;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  canvas.addEventListener('mousemove', (event) => {
    hover = canvasPoint(event);
  });
  canvas.addEventListener('click', (event) => {
    clicks.push(canvasPoint(event));
  });

  return {
    /** The movement vector from WASD / arrow keys held right now. */
    moveVector() {
      let dx = 0;
      let dy = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) dx -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) dx += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) dy -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) dy += 1;
      return { dx, dy };
    },
    takeActions() {
      const bits = actions.bits;
      actions.bits = 0;
      return bits;
    },
    takeClick() {
      return clicks.shift() ?? null;
    },
    hover() {
      return hover;
    },
  };
}
