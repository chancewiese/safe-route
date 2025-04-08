/**
 * Creates a debounced function that delays invoking func until after wait milliseconds have elapsed
 * since the last time the debounced function was invoked.
 *
 * @param {Function} func The function to debounce
 * @param {number} wait The number of milliseconds to delay
 * @returns {Function} Returns the new debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;

  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds
 *
 * @param {Function} func The function to throttle
 * @param {number} wait The number of milliseconds to throttle
 * @returns {Function} Returns the new throttled function
 */
export function throttle(func, wait = 300) {
  let inThrottle = false;
  let lastFunc;
  let lastRan;

  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      lastRan = Date.now();
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
      }, wait);
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if (Date.now() - lastRan >= wait) {
          func(...args);
          lastRan = Date.now();
        }
      }, wait - (Date.now() - lastRan));
    }
  };
}
