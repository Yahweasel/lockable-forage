Lockability for [localForage](https://localforage.github.io/localForage/).

Create a `LockableForage` instance with
`lkf = new LockableForage.LockableForage(localforage)`.

Lock with `await lkf.lock(key, async () => { /* critical section */ });`.

Trylock is also available: `await lkf.tryLock(key, criticalSection);`.

Inspired by but not based on https://github.com/elad/LockableStorage .


## Timers

`LockableForage` is necessarily based on timers. It's impossible to guarantee
removing a lock item before a browser window is closed, so the only way to be
certain that locks don't hold forever is to make them time out.

By default, locks time out after one second, and are refreshed every 100ms. If
your localforage backend driver is quite slow, it may make sense to change these
timers.

You can change both timers with `lkf.setTimes(x)`, where `x` is the refresh
time, in milliseconds.

To change only the refresh timer or only the timeout timer, use
`lkf.setReacquisitionTime` or `lkf.setTimeoutTime`.
