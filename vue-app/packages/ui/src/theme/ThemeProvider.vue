<script lang="ts">
import { defineComponent, provide, ref, watch } from "vue";
import { defaultTheme } from "./default";
import { applyTheme, THEME_KEY } from "./plugin";
import type { SgwTheme } from "./tokens";

export default defineComponent({
  name: "ThemeProvider",

  props: {
    theme: {
      type: Object as () => SgwTheme,
      default: () => defaultTheme,
    },
  },

  setup(props) {
    const theme = ref<SgwTheme>(props.theme);
    const setTheme = (next: SgwTheme) => {
      theme.value = next;
    };

    provide(THEME_KEY, { theme, setTheme });
    watch(theme, (next) => applyTheme(next), { deep: true, immediate: true });

    return { theme, setTheme };
  },

  render() {
    return this.$slots.default?.();
  },
});
</script>
