// Like / dislike (thumbs up / down) on other users' reviews, stored per device.
const KEY = 'bb_review_votes'

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') || {}
  } catch {
    return {}
  }
}

export const getVotes = () => read()

// Toggle: voting the same value again clears it. Returns the new map.
export const toggleVote = (reviewId, value) => {
  const map = read()
  if (map[reviewId] === value) delete map[reviewId]
  else map[reviewId] = value
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
  return map
}
