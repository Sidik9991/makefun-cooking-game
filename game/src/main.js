// Ember Pass Kitchen — boot and the one loop: input every frame, the kitchen
// advances in fixed 1/60 s steps, the renderer paints what is there. The game
// moves between three screens: title, play and rush complete.
//
// ?seed=N fixes the order deck. ?shot=cover|play|serve|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady.
import { BEST_KEY, STEP } from './config.js';
import {
  createKitchen, interact, nearestStation, startRush, trashCarried,
  updateKitchen, walkBy, walkToward,
} from './engine.js';
import {
  ACTION_CONFIRM, ACTION_HELP, ACTION_INTERACT, ACTION_MUTE, ACTION_PAUSE,
  ACTION_TRASH, createInput,
} from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';
import { sounds, toggleMute } from './audio.js';

const MAX_FRAME = 0.25;
const LAST_TICK_SECONDS = 10;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

/** Tiny deterministic deck: the order board shuffles from this, not Math.random. */
function createRandom(seedValue) {
  let state = seedValue >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score lasts this visit only.
  }
}

function runShot(name) {
  const game = createKitchen(createRandom(seed), seed);
  const scene = stageShot(name, game);
  if (name === 'end') renderer.burst();
  let painted = 0;
  function paint() {
    renderer.draw(game, scene.screen, scene.best, {});
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let game = createKitchen(createRandom(seed), seed);
  let help = false;
  let lastTickSecond = -1;
  let lastAlarmSecond = -1;

  function announce(message) {
    status.textContent = message;
  }

  function newRush() {
    game = createKitchen(createRandom(seed), seed);
    startRush(game);
    screen = SCREEN_PLAY;
    help = false;
    lastTickSecond = -1;
    announce('Rush started. Grab ingredients, chop, cook, serve!');
  }

  function endRush() {
    screen = SCREEN_OVER;
    if (game.score > best) {
      best = game.score;
      saveBest(best);
      sounds.win();
    } else {
      sounds.lose();
    }
    renderer.burst();
    announce(`Rush complete. ${game.served} dishes served, ${game.score} points.`);
  }

  /** Play the sound for the event interact() just returned. */
  function soundFor(event) {
    if (event === 'grab' || event === 'add') sounds.grab();
    else if (event === 'chop-start') sounds.chop();
    else if (event === 'cook') sounds.cook();
    else if (event === 'ready' || event === 'dish') sounds.ready();
    else if (event === 'serve') { sounds.serve(); renderer.burst(game.chef.x, game.chef.y - 40, 40); }
    else if (event === 'burnt' || event === 'burnt-clear') sounds.burnt();
    else if (event === 'missed') sounds.missed();
    else if (event === 'no-order' || event === 'full' || event === 'hint') sounds.click();
    else if (event === 'trash') sounds.missed();
    else if (event === 'plate') sounds.grab();
  }

  function handleClick(point) {
    const field = renderer.toField(point);
    if (screen === SCREEN_TITLE) {
      newRush();
      return;
    }
    if (screen === SCREEN_OVER) {
      newRush();
      return;
    }
    if (help) {
      help = false;
      return;
    }
    // Clicking a station in reach uses it; clicking the floor walks there.
    const station = nearestStation(game);
    if (station && field.x >= station.rect.x - 4 && field.x <= station.rect.x + station.rect.w + 4
      && field.y >= station.rect.y - 4 && field.y <= station.rect.y + station.rect.h + 4) {
      soundFor(interact(game));
      return;
    }
    game.chef.target = { x: field.x, y: Math.max(176, field.y) };
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) toggleMute();
    if (actions & ACTION_HELP) help = !help;
    if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      game.paused = !game.paused;
      announce(game.paused ? 'Paused.' : 'Cooking again.');
    }
    if (actions & ACTION_CONFIRM) {
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER) newRush();
    }
    // Clicks are taken on every screen: title/over clicks start a new rush.
    const click = input.takeClick();
    if (click) handleClick(click);
    if (screen !== SCREEN_PLAY || game.paused) return;
    if (actions & ACTION_INTERACT) soundFor(interact(game));
    if (actions & ACTION_TRASH) {
      if (trashCarried(game)) sounds.missed();
    }
  }

  function stepChef(dt) {
    const move = input.moveVector();
    if (move.dx !== 0 || move.dy !== 0) {
      walkBy(game, move.dx, move.dy, dt);
      return;
    }
    if (game.chef.target) {
      if (!walkToward(game, game.chef.target.x, game.chef.target.y, dt)) game.chef.target = null;
    } else {
      game.chef.moving = false;
    }
  }

  let accumulator = 0;
  let last = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY && !game.paused) {
      stepChef(dt);
      accumulator += dt;
      while (accumulator >= STEP) {
        updateKitchen(game, STEP);
        accumulator -= STEP;
      }
      // The last ten seconds tick, and a pot about to burn alarms once a second.
      const second = Math.ceil(game.timeLeft);
      if (game.timeLeft <= LAST_TICK_SECONDS && second !== lastTickSecond && game.timeLeft > 0) {
        lastTickSecond = second;
        sounds.tick();
      }
      for (const pot of game.pots) {
        if (pot.state === 'ready' && pot.burnLeft !== null && pot.burnLeft < 3) {
          const whole = Math.ceil(pot.burnLeft);
          if (whole !== lastAlarmSecond) {
            lastAlarmSecond = whole;
            sounds.alarm();
          }
        }
      }
      // Chop and ready events earn their sounds here, once per event.
      for (const event of game.events) {
        if (event.sounded) continue;
        event.sounded = true;
        if (event.type === 'chopped') sounds.chopped();
        else if (event.type === 'ready') sounds.ready();
        else if (event.type === 'burnt') sounds.burnt();
        else if (event.type === 'missed') sounds.missed();
      }
      if (game.over) endRush();
      renderer.updateAnimations(dt);
    } else if (screen === SCREEN_OVER) {
      renderer.updateAnimations(dt);
    }
    renderer.draw(game, screen, best, { help });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      game.paused = true;
      announce('Paused.');
    }
  });

  // Read-only state for automated play-testing; the game never reads it back.
  window.__emberPass = {
    state: () => ({
      screen,
      score: game.score,
      combo: game.combo,
      served: game.served,
      timeLeft: Math.round(game.timeLeft),
      tickets: game.tickets.map((ticket) => ticket.recipeId),
      carried: game.carried.map((item) => `${item.kind}:${item.id}`),
      pots: game.pots.map((pot) => pot.state),
      over: game.over,
      chef: { x: Math.round(game.chef.x), y: Math.round(game.chef.y) },
    }),
    interact: () => interact(game),
    teleport: (x, y) => { game.chef.x = x; game.chef.y = y; },
  };

  announce('Ember Pass Kitchen. Press Enter or click to start the rush.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
