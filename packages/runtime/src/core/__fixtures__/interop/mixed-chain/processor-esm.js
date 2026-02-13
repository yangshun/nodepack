import data from '/data-cjs.js';

export function getCount() {
  return data.users.length;
}

export function getFirst() {
  return data.users[0];
}
