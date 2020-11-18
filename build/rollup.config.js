import alias from '@rollup/plugin-alias'
import autoExternal from 'rollup-plugin-auto-external'
import commonjs from '@rollup/plugin-commonjs'
import { terser } from 'rollup-plugin-terser'
import typescript from 'rollup-plugin-typescript2'
import vue from 'rollup-plugin-vue'

// noinspection JSUnusedGlobalSymbols
export default {
    input: 'src/index.ts',
    output: [{
        name: 'Formulario',
        exports: 'default',
        globals: {
            'is-plain-object': 'isPlainObject',
            'is-url': 'isUrl',
            'nanoid/non-secure': 'nanoid',
            vue: 'Vue',
            'vue-property-decorator': 'vuePropertyDecorator',
        },
        sourcemap: false,
    }],
    external: ['nanoid/non-secure', 'vue', 'vue-property-decorator'],
    plugins: [
        typescript({ sourceMap: false }),
        vue({ css: true, compileTemplate: true }),
        alias({ entries: [{ find: /^@\/(.+)/, replacement: './$1' }] }),
        commonjs(),
        autoExternal(),
        // terser(),
    ]
}
