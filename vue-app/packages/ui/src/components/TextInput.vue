<script setup lang="ts">
import { computed, useId } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    type?: "text" | "email" | "password" | "search";
    label?: string;
    placeholder?: string;
    error?: string;
    disabled?: boolean;
    autocomplete?: string;
    name?: string;
    required?: boolean;
  }>(),
  {
    modelValue: "",
    type: "text",
    placeholder: "",
    disabled: false,
    autocomplete: "off",
    required: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  blur: [event: FocusEvent];
  focus: [event: FocusEvent];
}>();

const inputId = useId();
const errorId = computed(() => `${inputId}-error`);

const onInput = (e: Event) => {
  emit("update:modelValue", (e.target as HTMLInputElement).value);
};
</script>

<template>
  <div
    class="vz-field"
    :class="{ 'vz-field--error': error, 'vz-field--disabled': disabled }"
  >
    <label v-if="label" :for="inputId" class="vz-field__label">
      {{ label }}
    </label>

    <div class="vz-field__wrap">
      <!-- Optional prefix slot — icons, country codes etc. -->
      <div v-if="$slots.prefix" class="vz-field__prefix">
        <slot name="prefix" />
      </div>

      <input
        :id="inputId"
        :name="props.name"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :autocomplete="autocomplete"
        :aria-describedby="error ? errorId : undefined"
        :aria-invalid="error ? 'true' : undefined"
        class="vz-field__input"
        :class="{ 'vz-field__input--prefixed': $slots.prefix }"
        v-bind="$attrs"
        @input="onInput"
        @blur="emit('blur', $event)"
        @focus="emit('focus', $event)"
      />
    </div>

    <p v-if="error" :id="errorId" class="vz-field__error" role="alert">
      {{ error }}
    </p>
  </div>
</template>

<style scoped>
.vz-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.vz-field__label {
  font-family: var(--vz-font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--vz-text3);
}

.vz-field__wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.vz-field__prefix {
  position: absolute;
  left: 0.9rem;
  display: flex;
  align-items: center;
  color: var(--vz-text3);
  pointer-events: none;
}

.vz-field__input {
  width: 100%;
  background: var(--vz-surface);
  border: 1px solid var(--vz-border2);
  border-radius: var(--vz-radius-md);
  padding: 0.75rem 0.9rem;
  font-size: 1rem;
  font-family: var(--vz-font-sans);
  color: var(--vz-text);
  outline: none;
  transition: border-color 0.15s;
}

.vz-field__input::placeholder {
  color: var(--vz-text3);
}

.vz-field__input:focus {
  border-color: var(--vz-text2);
}

.vz-field__input--prefixed {
  padding-left: 2.5rem;
}

.vz-field__input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Error state ── */
.vz-field--error .vz-field__input {
  border-color: var(--vz-red);
}

.vz-field__error {
  font-size: 0.82rem;
  color: var(--vz-red);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.vz-field__error::before {
  content: "";
  display: inline-block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--vz-red);
  flex-shrink: 0;
}
</style>
