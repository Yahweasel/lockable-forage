Lockability for [localForage](https://localforage.github.io/localForage/).

Create a `LockableForage` instance with
`lkf = new LockableForage.LockableForage(localforage)`.

Lock with `await lkf.lock(key, async () => { /* critical section */ });`.

Trylock is also available: `await lkf.tryLock(key, criticalSection);`.

Inspired by but not based on https://github.com/elad/LockableStorage .
