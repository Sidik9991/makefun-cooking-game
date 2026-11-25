// Ember Pass Kitchen — the order board: tickets arrive, tick down, pay out.
// One job: when orders spawn, how long a ticket lives, and what a serve earns.

import { RECIPES } from './recipes.js';

export const TICKET_SECONDS_EARLY = 45;
export const TICKET_SECONDS_LATE = 30;
export const BASE_SCORE = 100;
export const TIME_BONUS_MAX = 100;
export const COMBO_STEP = 25;
export const MISS_PENALTY = 50;

let nextTicketId = 1;

/** A ticket: which dish, how long it has left, and when it was born. */
export function createTicket(recipeId, secondsLeft, bornAt) {
  return { id: nextTicketId++, recipeId, secondsLeft, total: secondsLeft, bornAt };
}

/**
 * The gap between orders shrinks as the rush goes on: 12 s at the start, 6 s
 * by the end, so pressure grows without adding a new chore.
 */
export function spawnGap(elapsed) {
  return Math.max(6, 12 - elapsed * 0.08);
}

/** How long a fresh ticket lives: shorter tickets late in the rush. */
export function ticketSeconds(elapsed) {
  return elapsed > 55 ? TICKET_SECONDS_LATE : TICKET_SECONDS_EARLY;
}

/** Pick a recipe for a new ticket: two-ingredient dishes early, anything late. */
export function pickRecipe(random, elapsed) {
  const pool = RECIPES.filter((recipe) => (elapsed > 40 ? true : recipe.needs.length === 2));
  return pool[Math.floor(random() * pool.length)];
}

/** Points for serving a ticket with this much time left, at this combo. */
export function serveScore(ticket, combo) {
  const timeShare = Math.max(0, ticket.secondsLeft / ticket.total);
  return BASE_SCORE + Math.round(TIME_BONUS_MAX * timeShare) + combo * COMBO_STEP;
}

/**
 * Advance the board one step: tickets tick down, expired ones are reported
 * (the caller applies the penalty) and a new order spawns when due.
 */
export function updateOrders(board, dt, elapsed, random) {
  const expired = [];
  for (const ticket of board.tickets) ticket.secondsLeft -= dt;
  board.tickets = board.tickets.filter((ticket) => {
    if (ticket.secondsLeft <= 0) {
      expired.push(ticket);
      return false;
    }
    return true;
  });
  board.spawnIn -= dt;
  let spawned = null;
  if (board.spawnIn <= 0 && board.tickets.length < 4) {
    const recipe = pickRecipe(random, elapsed);
    spawned = createTicket(recipe.id, ticketSeconds(elapsed), elapsed);
    board.tickets.push(spawned);
    board.spawnIn = spawnGap(elapsed);
  }
  return { expired, spawned };
}

/** The oldest ticket asking for this dish, or null. */
export function findTicket(board, recipeId) {
  return board.tickets.find((ticket) => ticket.recipeId === recipeId) ?? null;
}

export function removeTicket(board, ticket) {
  board.tickets = board.tickets.filter((other) => other.id !== ticket.id);
}
