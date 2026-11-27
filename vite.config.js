import {defineConfig} from 'vite';
export default defineConfig({base:'./',build:{target:'es2022',rolldownOptions:{output:{codeSplitting:{groups:[{name:'map-engine',test:/node_modules[\\/]maplibre-gl[\\/]/},{name:'orbit-engine',test:/node_modules[\\/]satellite\.js[\\/]/}]}}}}});
