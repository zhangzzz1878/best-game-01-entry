// Neon Swarm — keyboard and mouse input.
// Tracks held keys, the mouse position in screen space, and one-shot key presses
// (consumed by the game loop so a single tap never fires twice).

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    pressed: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    // True once the player has interacted (needed before audio may start).
    interacted: false,
  };

  const GAME_KEYS = new Set([
    'KeyW', 'KeyA', 'KeyS', 'KeyD',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'Space', 'ShiftLeft', 'ShiftRight',
    'Escape', 'KeyP', 'KeyM', 'KeyR', 'Enter',
    'Digit1', 'Digit2', 'Digit3',
  ]);

  window.addEventListener('keydown', (event) => {
    if (!GAME_KEYS.has(event.code)) return;
    event.preventDefault();
    input.interacted = true;
    if (!input.keys.has(event.code)) input.pressed.add(event.code);
    input.keys.add(event.code);
  });

  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.code);
  });

  window.addEventListener('blur', () => {
    input.keys.clear();
    input.mouseDown = false;
  });

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = event.clientX - rect.left;
    input.mouseY = event.clientY - rect.top;
  });

  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
      input.mouseDown = true;
      input.interacted = true;
    }
  });

  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) input.mouseDown = false;
  });

  return input;
}

// True once for the frame the key went down; call after handling each frame.
export function wasPressed(input, code) {
  return input.pressed.has(code);
}

export function endFrame(input) {
  input.pressed.clear();
}

// Normalized movement vector from WASD / arrow keys.
export function moveVector(input) {
  let x = 0;
  let y = 0;
  if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) x -= 1;
  if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) x += 1;
  if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) y -= 1;
  if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) y += 1;
  if (x !== 0 && y !== 0) {
    const inv = 1 / Math.SQRT2;
    x *= inv;
    y *= inv;
  }
  return { x, y };
}

export function wantsDash(input) {
  return input.keys.has('Space') || input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
}
