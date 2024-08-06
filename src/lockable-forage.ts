/*
 * Copyright (c) 2024 Yahweasel
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
 * SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
 * OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
 * CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

/* This code is inspired by but not derived from
 * https://github.com/elad/LockableStorage
 *
 * Note that this locking solution does introduce the possibility of livelock.
 * We attempt to mitigate it with random timing, but that is no guarantee.
 */

import type * as localforageT from "localforage";

interface LockState {
    id: string;
    time: number;
}

/**
 * Wrapper for a LocalForage instance to provide goodish locking.
 */
export class LockableForage {
    constructor(
        /**
         * LocalForage backend to use for locking.
         */
        public localforage: typeof localforageT
    ) {
        this._promise = Promise.all([]);
        this._reacquisitionTime = 100;
        this._timeoutTime = 1000;
    }

    /**
     * Set the times. This will set the lock reacquisition time to `x`, and
     * the lock timeout time to `10*x`.
     * @param x  Time in milliseconds for the lock reacquisition time.
     */
    setTimes(x: number) {
        this.setReacquisitionTime(x);
        this.setTimeoutTime(10*x);
    }

    /**
     * Set the lock reacquisition time.
     * @param x  Time in milliseconds.
     */
    setReacquisitionTime(x: number) {
        this._reacquisitionTime = x;
    }

    /**
     * Set the lock timeout time.
     * @param x  Tiem in milliseconds.
     */
    setTimeoutTime(x: number) {
        this._timeoutTime = x;
    }

    /**
     * Main lock implementation. Use `block` to make it block for locking.
     * Returns whether locking was successful. If the critical section ran and
     * threw, that's thrown through this.
     * @param key  Name for locking key. This does not need to be the key you edit
     *             during the critical section.
     * @param block  Block for locking.
     * @param criticalSection  Critical section to run with the lock.
     */
    async maybeLock(
        key: string, block: boolean, criticalSection: () => Promise<any>
    ): Promise<boolean> {
        const keyX = `${key}__MUTEX_x`;
        const keyY = `${key}__MUTEX_y`;

        const myLock: LockState = {
            id: Math.random().toString() + Math.random() + Math.random(),
            time: 0
        };

        function now() {
            return new Date().getTime();
        }

        function locked(lockState: LockState | null) {
            return (lockState &&
                    lockState.id !== myLock.id &&
                    lockState.time > now());
        }

        while (true) {
            const p = this._promise.catch(console.error).then(async () => {
                /* The principle is to lock both and use the ordering between the
                 * races to choose a victor. */
                myLock.time = now() + this._timeoutTime;

                // Set x then y
                let lockState: LockState | null =
                    await this.localforage.getItem(keyX);
                if (locked(lockState)) {
                    if (!block)
                        return false;
                    await new Promise(
                        res => setTimeout(res, this._reacquisitionTime));
                    return false;
                }
                await this.localforage.setItem(keyX, myLock);
                lockState =
                    await this.localforage.getItem(keyY);
                if (locked(lockState)) {
                    if (!block)
                        return false;
                    await new Promise(
                        res => setTimeout(res, this._reacquisitionTime));
                    return false;
                }
                await this.localforage.setItem(keyY, myLock);

                /* Check if x indicates that a race happened. It's actually the
                 * winner of the *x* race that gets to continue, not the *y* race. */
                lockState = await this.localforage.getItem(keyX);
                if (!lockState || lockState.id !== myLock.id) {
                    if (!block)
                        return false;
                    await new Promise(res => {
                        setTimeout(
                            res,
                            (Math.random() * this._reacquisitionTime)
                        );
                    });
                    return false;
                }

                return true;
            });
            this._promise = p;
            const acquired = await p;
            if (!acquired) {
                if (!block)
                    return false;
                continue;
            }

            // Periodically reacquire to keep locked
            const reacquireInterval = setInterval(async () => {
                myLock.time = now() + this._timeoutTime;
                await this.localforage.setItem(keyX, myLock);
            }, this._reacquisitionTime);

            // Do it
            let threw = false;
            let ex: any = null;
            try {
                await criticalSection();
            } catch (tex) {
                threw = true;
                ex = tex;
            }

            // Unlock
            clearInterval(reacquireInterval);
            await this.localforage.removeItem(keyY);
            await this.localforage.removeItem(keyX);
            if (threw)
                throw ex;
            return true;
        }
    }

    /**
     * Lock on this key. Returns the result of criticalSection.
     * @param key  Key to lock on.
     * @param criticalSection  Critical section to run with the lock.
     */
    async lock<T>(
        key: string, criticalSection: () => Promise<T>
    ): Promise<T> {
        let ret: T;
        await this.maybeLock(key, true, async () => {
            ret = await criticalSection();
        });
        return ret!;
    }

    /**
     * Try to lock on this key. Returns true if locking was successful and the
     * critical section ran.
     * @param key  Key to lock on.
     * @param criticalSection  Critical section to run with the lock.
     */
    tryLock(
        key: string, criticalSection: () => Promise<any>
    ): Promise<boolean> {
        return this.maybeLock(key, false, criticalSection);
    }

    private _promise: Promise<unknown>;
    private _reacquisitionTime: number;
    private _timeoutTime: number;
}
