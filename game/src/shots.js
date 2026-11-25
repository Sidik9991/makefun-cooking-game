// Ember Pass Kitchen — the screenshot scenes behind ?shot=cover|play|serve|end.
// One job: drive the real engine to a frame a short game really looks like,
// so the same seed always gives the same frame. No scene is faked.

import { BURNERS } from './config.js';
import { RECIPE_BY_ID } from './recipes.js';
import { createTicket } from './orders.js';
import { createKitchen, startRush, updateKitchen } from './engine.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/** Put a finished dish in the chef's hands and one on a plate. */
function stageCover(game) {
  startRush(game);
  game.elapsed = 45;
  game.timeLeft = 45;
  game.score = 320;
  game.combo = 2;
  game.bestCombo = 2;
  game.served = 3;
  game.tickets = [
    createTicket('tomato-soup', 38, 0),
    createTicket('mushroom-pasta', 24, 0),
    createTicket('garden-salad', 12, 0),
  ];
  // A dish mid-assembly: chopped tomato and onion on the first board.
  game.boards[0].item = { kind: 'ingredient', id: 'tomato', chopped: true };
  game.boards[1].item = { kind: 'ingredient', id: 'onion', chopped: false };
  game.boards[1].progress = 0.9;
  // A pot of tomato soup halfway cooked, a salad pot ready on another burner.
  const soup = RECIPE_BY_ID.get('tomato-soup');
  game.pots[0].items = [
    { kind: 'ingredient', id: 'tomato', chopped: true },
    { kind: 'ingredient', id: 'onion', chopped: true },
  ];
  game.pots[0].state = 'cooking';
  game.pots[0].progress = soup.cookSeconds / 2;
  game.pots[0].recipeId = 'tomato-soup';
  game.pots[1].items = [
    { kind: 'ingredient', id: 'lettuce', chopped: true },
    { kind: 'ingredient', id: 'tomato', chopped: true },
    { kind: 'ingredient', id: 'carrot', chopped: true },
  ];
  game.pots[1].state = 'ready';
  game.pots[1].burnLeft = null;
  game.pots[1].recipeId = 'garden-salad';
  // A plated dish ready to serve, and the chef carrying one more ingredient.
  game.plates[0] = 'cheese-omelette';
  game.carried = [{ kind: 'ingredient', id: 'mushroom', chopped: true }];
  game.chef.x = 470;
  game.chef.y = 470;
  game.events = [{ type: 'cook', text: 'Tomato Soup on the burner — juggle the burn!', age: 0.4 }];
  return { screen: SCREEN_PLAY, best: 320 };
}

function stagePlay(game) {
  startRush(game);
  game.elapsed = 62;
  game.timeLeft = 28;
  game.score = 640;
  game.combo = 4;
  game.bestCombo = 4;
  game.served = 6;
  game.tickets = [
    createTicket('mushroom-pasta', 18, 0),
    createTicket('cheese-omelette', 26, 0),
    createTicket('veggie-stirfry', 9, 0),
    createTicket('tomato-pasta', 33, 0),
  ];
  // Mid-rush: two pots cooking, one dish a breath from burning, one board busy.
  const pasta = RECIPE_BY_ID.get('mushroom-pasta');
  game.pots[0].items = [
    { kind: 'ingredient', id: 'pasta', chopped: false },
    { kind: 'ingredient', id: 'mushroom', chopped: true },
    { kind: 'ingredient', id: 'cheese', chopped: false },
  ];
  game.pots[0].state = 'cooking';
  game.pots[0].progress = pasta.cookSeconds * 0.7;
  game.pots[0].recipeId = 'mushroom-pasta';
  game.pots[1].state = 'ready';
  game.pots[1].burnLeft = 2.4;
  game.pots[1].recipeId = 'cheese-omelette';
  game.pots[1].items = [
    { kind: 'ingredient', id: 'egg', chopped: false },
    { kind: 'ingredient', id: 'cheese', chopped: false },
  ];
  game.pots[2].items = [
    { kind: 'ingredient', id: 'carrot', chopped: true },
    { kind: 'ingredient', id: 'mushroom', chopped: true },
  ];
  game.pots[2].state = 'filling';
  game.boards[0].item = { kind: 'ingredient', id: 'onion', chopped: false };
  game.boards[0].progress = 1.1;
  game.carried = [
    { kind: 'ingredient', id: 'tomato', chopped: true },
    { kind: 'ingredient', id: 'cheese', chopped: false },
  ];
  game.chef.x = 400;
  game.chef.y = 500;
  game.events = [{ type: 'ready', text: 'Dish ready — get it off before it burns!', age: 0.3 }];
  return { screen: SCREEN_PLAY, best: 640 };
}

function stageServe(game) {
  startRush(game);
  game.elapsed = 30;
  game.timeLeft = 60;
  game.score = 410;
  game.combo = 3;
  game.bestCombo = 3;
  game.served = 4;
  game.tickets = [
    createTicket('tomato-soup', 22, 0),
    createTicket('garden-salad', 15, 0),
  ];
  // The plating moment: soup ready in the chef's hands at the serve window.
  game.plates[0] = 'garden-salad';
  game.carried = [{ kind: 'dish', id: 'tomato-soup' }];
  game.chef.x = 1144;
  game.chef.y = 180;
  game.events = [{ type: 'dish', text: 'Dish off the burner — plate it and serve!', age: 0.2 }];
  return { screen: SCREEN_PLAY, best: 410 };
}

function stageEnd(game) {
  startRush(game);
  game.elapsed = 90;
  game.timeLeft = 0;
  game.score = 1180;
  game.combo = 0;
  game.bestCombo = 5;
  game.served = 9;
  game.missed = 1;
  game.burnt = 1;
  game.over = true;
  return { screen: SCREEN_OVER, best: 1180 };
}

/**
 * Set `game` to the named scene (cover, play, serve or end; any other name is
 * the title) and return the screen to draw and the best score to show.
 */
export function stageShot(name, game) {
  if (name === 'cover') return stageCover(game);
  if (name === 'play') return stagePlay(game);
  if (name === 'serve') return stageServe(game);
  if (name === 'end') return stageEnd(game);
  return { screen: SCREEN_TITLE, best: 0 };
}

export { createKitchen, startRush, updateKitchen };
