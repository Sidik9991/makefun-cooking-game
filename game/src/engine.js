// Ember Pass Kitchen — the kitchen itself: stations, the burn, the rush.
// One job: the whole playable state and every rule that changes it. The
// renderer only paints this state; input only calls interact() and the movers.

import {
  BINS, BURNERS, BURN_SECONDS, CARRY_MAX, CHEF_RADIUS, CHEF_SPEED, CHEF_START, CHOP_BOARDS,
  CHOP_SECONDS, FIELD_H, FIELD_W, MAX_TICKETS, PLATES, RUSH_SECONDS, SERVE_WINDOW,
  TRASH, rectCenter,
} from './config.js';
import { INGREDIENT_BY_ID } from './config.js';
import { couldBecomeRecipe, makeDish, makeIngredient, matchRecipe, RECIPE_BY_ID } from './recipes.js';
import { createTicket, findTicket, pickRecipe, removeTicket, serveScore, ticketSeconds, updateOrders, MISS_PENALTY } from './orders.js';

/** A fresh kitchen: no rush running yet, the chef by the stove, one order up. */
export function createKitchen(random, seed) {
  return {
    random,
    seed,
    running: false,
    over: false,
    paused: false,
    elapsed: 0,
    timeLeft: RUSH_SECONDS,
    score: 0,
    combo: 0,
    bestCombo: 0,
    served: 0,
    missed: 0,
    burnt: 0,
    chef: { x: CHEF_START.x, y: CHEF_START.y, moving: false, target: null },
    carried: [],
    boards: CHOP_BOARDS.map(() => ({ item: null, progress: 0 })),
    pots: BURNERS.map(() => ({ items: [], state: 'empty', progress: 0, burnLeft: 0, recipeId: null })),
    plates: PLATES.map(() => null),
    tickets: [],
    spawnIn: 2,
    events: [],
    log: [],
  };
}

/** Start (or restart) the 90-second rush with two orders on the board. */
export function startRush(kitchen) {
  const fresh = createKitchen(kitchen.random, kitchen.seed);
  Object.assign(kitchen, fresh, { running: true });
  kitchen.tickets.push(createTicket(pickRecipe(kitchen.random, 0).id, ticketSeconds(0), 0));
  kitchen.tickets.push(createTicket(pickRecipe(kitchen.random, 0).id, ticketSeconds(0), 0));
  kitchen.spawnIn = 8;
  pushEvent(kitchen, 'rush', 'Rush started — 90 seconds, serve them all!');
}

export function pushEvent(kitchen, type, text) {
  kitchen.events.push({ type, text, age: 0 });
  kitchen.log.push(text);
  if (kitchen.log.length > 6) kitchen.log.shift();
}

/** Distance from the chef to a station rect (0 when standing on it). */
function distanceTo(chef, rect) {
  const cx = Math.max(rect.x, Math.min(chef.x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(chef.y, rect.y + rect.h));
  return Math.hypot(chef.x - cx, chef.y - cy);
}

/**
 * The station the chef can reach, nearest first. Bins, boards, burners, plates,
 * the serve window and the trash are all one list to the hand.
 */
export function nearestStation(kitchen) {
  const chef = kitchen.chef;
  const candidates = [];
  for (let i = 0; i < BINS.length; i++) candidates.push({ kind: 'bin', index: i, rect: BINS[i], dist: distanceTo(chef, BINS[i]) });
  for (let i = 0; i < CHOP_BOARDS.length; i++) candidates.push({ kind: 'board', index: i, rect: CHOP_BOARDS[i], dist: distanceTo(chef, CHOP_BOARDS[i]) });
  for (let i = 0; i < BURNERS.length; i++) candidates.push({ kind: 'burner', index: i, rect: BURNERS[i], dist: distanceTo(chef, BURNERS[i]) });
  for (let i = 0; i < PLATES.length; i++) candidates.push({ kind: 'plate', index: i, rect: PLATES[i], dist: distanceTo(chef, PLATES[i]) });
  candidates.push({ kind: 'serve', index: 0, rect: SERVE_WINDOW, dist: distanceTo(chef, SERVE_WINDOW) });
  candidates.push({ kind: 'trash', index: 0, rect: TRASH, dist: distanceTo(chef, TRASH) });
  candidates.sort((a, b) => a.dist - b.dist);
  return candidates[0].dist <= 110 ? candidates[0] : null;
}

/** Walk the chef toward a point for one step; returns true while still walking. */
export function walkToward(kitchen, tx, ty, dt) {
  const chef = kitchen.chef;
  const dx = tx - chef.x;
  const dy = ty - chef.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return false;
  const step = Math.min(dist, CHEF_SPEED * dt);
  chef.x += (dx / dist) * step;
  chef.y += (dy / dist) * step;
  chef.x = Math.max(16 + CHEF_RADIUS, Math.min(FIELD_W - 16 - CHEF_RADIUS, chef.x));
  chef.y = Math.max(176, Math.min(FIELD_H - 16 - CHEF_RADIUS, chef.y));
  chef.moving = true;
  return true;
}

/** Walk the chef by a direction vector for one step (keyboard movement). */
export function walkBy(kitchen, dx, dy, dt) {
  const chef = kitchen.chef;
  const len = Math.hypot(dx, dy);
  if (len === 0) {
    chef.moving = false;
    return;
  }
  chef.x = Math.max(16 + CHEF_RADIUS, Math.min(FIELD_W - 16 - CHEF_RADIUS, chef.x + (dx / len) * CHEF_SPEED * dt));
  chef.y = Math.max(176, Math.min(FIELD_H - 16 - CHEF_RADIUS, chef.y + (dy / len) * CHEF_SPEED * dt));
  chef.moving = true;
  chef.target = null;
}

/** Drop the last carried item into the trash. */
export function trashCarried(kitchen) {
  const item = kitchen.carried.pop();
  if (!item) return null;
  pushEvent(kitchen, 'trash', `Tossed ${item.kind === 'dish' ? 'a dish' : INGREDIENT_BY_ID.get(item.id)?.name ?? item.id}.`);
  return item;
}

/**
 * Use the nearest station: grab an ingredient, chop it, feed a pot, take a
 * finished dish, plate it, or serve it. Returns an event type for the sound.
 */
export function interact(kitchen) {
  if (!kitchen.running || kitchen.over || kitchen.paused) return null;
  const station = nearestStation(kitchen);
  if (!station) return null;
  const chef = kitchen.chef;

  if (station.kind === 'bin') {
    if (kitchen.carried.length >= CARRY_MAX) {
      pushEvent(kitchen, 'full', 'Hands full — serve or trash something first.');
      return 'full';
    }
    const id = BINS[station.index].id;
    kitchen.carried.push(makeIngredient(id));
    pushEvent(kitchen, 'grab', `Grabbed ${INGREDIENT_BY_ID.get(id).name}.`);
    return 'grab';
  }

  if (station.kind === 'board') {
    const board = kitchen.boards[station.index];
    if (!board.item) {
      const at = kitchen.carried.findIndex((item) => item.kind === 'ingredient' && INGREDIENT_BY_ID.get(item.id)?.chop && !item.chopped);
      if (at < 0) {
        pushEvent(kitchen, 'hint', 'Chop board: carry something that needs chopping.');
        return 'hint';
      }
      board.item = kitchen.carried.splice(at, 1)[0];
      board.progress = 0;
      pushEvent(kitchen, 'chop-start', `Chopping ${INGREDIENT_BY_ID.get(board.item.id).name}…`);
      return 'chop-start';
    }
    if (!board.item.chopped) {
      pushEvent(kitchen, 'hint', 'Still chopping — give it a second.');
      return 'hint';
    }
    if (kitchen.carried.length >= CARRY_MAX) {
      pushEvent(kitchen, 'full', 'Hands full — make room first.');
      return 'full';
    }
    kitchen.carried.push(board.item);
    pushEvent(kitchen, 'grab', `Picked up chopped ${INGREDIENT_BY_ID.get(board.item.id).name}.`);
    board.item = null;
    board.progress = 0;
    return 'grab';
  }

  if (station.kind === 'burner') {
    const pot = kitchen.pots[station.index];
    if (pot.state === 'burnt') {
      pot.items = [];
      pot.state = 'empty';
      pot.progress = 0;
      pot.recipeId = null;
      pushEvent(kitchen, 'burnt-clear', 'Burnt pot scraped clean. The dish is gone.');
      return 'burnt-clear';
    }
    if (pot.state === 'ready') {
      if (kitchen.carried.length >= CARRY_MAX) {
        pushEvent(kitchen, 'full', 'Hands full — make room first.');
        return 'full';
      }
      kitchen.carried.push(makeDish(pot.recipeId));
      pushEvent(kitchen, 'dish', 'Dish off the burner — plate it and serve!');
      pot.items = [];
      pot.state = 'empty';
      pot.progress = 0;
      pot.recipeId = null;
      return 'dish';
    }
    if (pot.state === 'cooking') {
      pushEvent(kitchen, 'hint', 'Still cooking — watch the burn clock.');
      return 'hint';
    }
    // Filling (or empty): add a carried ingredient that keeps a recipe possible.
    const at = kitchen.carried.findIndex((item) => {
      if (item.kind !== 'ingredient') return false;
      if (pot.items.length >= 3) return false;
      return couldBecomeRecipe([...pot.items, item]);
    });
    if (at < 0) {
      pushEvent(kitchen, 'hint', pot.items.length === 0 ? 'Pot: carry an ingredient to start a dish.' : 'That does not fit any recipe with this pot.');
      return 'hint';
    }
    const added = kitchen.carried.splice(at, 1)[0];
    pot.items.push(added);
    const recipe = matchRecipe(pot.items);
    if (recipe) {
      pot.recipeId = recipe.id;
      if (recipe.cookSeconds === 0) {
        pot.state = 'ready';
        pot.burnLeft = null;
        pushEvent(kitchen, 'ready', `${recipe.name} is ready — no burner needed!`);
        return 'ready';
      }
      pot.state = 'cooking';
      pot.progress = 0;
      pushEvent(kitchen, 'cook', `${recipe.name} on the burner — juggle the burn!`);
      return 'cook';
    }
    pot.state = 'filling';
    pushEvent(kitchen, 'add', `Added ${INGREDIENT_BY_ID.get(added.id).name} to the pot.`);
    return 'add';
  }

  if (station.kind === 'plate') {
    const dish = kitchen.plates[station.index];
    if (dish) {
      if (kitchen.carried.length >= CARRY_MAX) {
        pushEvent(kitchen, 'full', 'Hands full — make room first.');
        return 'full';
      }
      kitchen.carried.push(makeDish(dish));
      kitchen.plates[station.index] = null;
      pushEvent(kitchen, 'grab', 'Picked the plated dish back up.');
      return 'grab';
    }
    const at = kitchen.carried.findIndex((item) => item.kind === 'dish');
    if (at < 0) {
      pushEvent(kitchen, 'hint', 'Plating counter: carry a finished dish to plate it.');
      return 'hint';
    }
    kitchen.plates[station.index] = kitchen.carried.splice(at, 1)[0].id;
    pushEvent(kitchen, 'plate', 'Dish plated and ready to serve.');
    return 'plate';
  }

  if (station.kind === 'serve') {
    const at = kitchen.carried.findIndex((item) => item.kind === 'dish');
    if (at < 0) {
      pushEvent(kitchen, 'hint', 'Serve window: carry a finished dish here.');
      return 'hint';
    }
    const dish = kitchen.carried[at];
    const ticket = findTicket(kitchen, dish.id);
    if (!ticket) {
      pushEvent(kitchen, 'no-order', 'Nobody ordered that — it stays in your hands.');
      return 'no-order';
    }
    kitchen.carried.splice(at, 1);
    const points = serveScore(ticket, kitchen.combo);
    kitchen.score += points;
    kitchen.combo += 1;
    kitchen.bestCombo = Math.max(kitchen.bestCombo, kitchen.combo);
    kitchen.served += 1;
    removeTicket(kitchen, ticket);
    pushEvent(kitchen, 'serve', `Served! +${points} (combo x${kitchen.combo}).`);
    return 'serve';
  }

  if (station.kind === 'trash') {
    if (kitchen.carried.length === 0) return 'hint';
    trashCarried(kitchen);
    return 'trash';
  }
  return null;
}

/** Advance the rush one step: the clock, the chopping, the burn, the board. */
export function updateKitchen(kitchen, dt) {
  for (const event of kitchen.events) event.age += dt;
  kitchen.events = kitchen.events.filter((event) => event.age < 3.5);
  if (!kitchen.running || kitchen.over || kitchen.paused) return;
  kitchen.elapsed += dt;
  kitchen.timeLeft -= dt;
  if (kitchen.timeLeft <= 0) {
    kitchen.timeLeft = 0;
    kitchen.over = true;
    pushEvent(kitchen, 'end', `Rush over! ${kitchen.served} dishes served, ${kitchen.score} points.`);
    return;
  }
  for (const board of kitchen.boards) {
    if (board.item && !board.item.chopped) {
      board.progress += dt;
      if (board.progress >= CHOP_SECONDS) {
        board.item.chopped = true;
        pushEvent(kitchen, 'chopped', `${INGREDIENT_BY_ID.get(board.item.id).name} chopped.`);
      }
    }
  }
  for (const pot of kitchen.pots) {
    if (pot.state === 'cooking') {
      pot.progress += dt;
      const seconds = pot.recipeId ? cookSecondsOf(pot.recipeId) : 0;
      if (pot.progress >= seconds) {
        pot.state = 'ready';
        pot.burnLeft = BURN_SECONDS;
        pushEvent(kitchen, 'ready', 'Dish ready — get it off before it burns!');
      }
    } else if (pot.state === 'ready' && pot.burnLeft !== null) {
      pot.burnLeft -= dt;
      if (pot.burnLeft <= 0) {
        pot.state = 'burnt';
        pot.burnLeft = 0;
        kitchen.burnt += 1;
        kitchen.combo = 0;
        pushEvent(kitchen, 'burnt', 'Burnt! The dish is ruined — scrape the pot.');
      }
    }
  }
  const { expired } = updateOrders(kitchen, dt, kitchen.elapsed, kitchen.random);
  for (const ticket of expired) {
    kitchen.missed += 1;
    kitchen.combo = 0;
    kitchen.score = Math.max(0, kitchen.score - MISS_PENALTY);
    pushEvent(kitchen, 'missed', `Order missed (-${MISS_PENALTY}). Combo lost.`);
  }
}

/** A recipe's cooking time, looked up by id. */
function cookSecondsOf(recipeId) {
  return RECIPE_BY_ID.get(recipeId)?.cookSeconds ?? 0;
}

export { rectCenter };
