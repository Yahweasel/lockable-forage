import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

export default {
    input: "src/lockable-forage.ts",
    output: [
        {
            file: "dist/lockableforage.js",
            format: "umd",
            name: "LockableForage"
        }, {
            file: "dist/lockableforage.min.js",
            format: "umd",
            name: "LockableForage",
            plugins: [terser()]
        }
    ],
    plugins: [typescript()]
};
