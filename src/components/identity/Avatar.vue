<script setup lang="ts">
import { computed } from "vue";
import type { AvatarColor } from "@/shared/types/identity";
import { AVATAR_COLOR_HEX, DEFAULT_AVATAR_COLOR, avatarInitial } from "./avatar";

// Without `size` the caller's class sets --avatar-size, so it can change per breakpoint.
const props = defineProps<{
  emoji: string | null;
  color: AvatarColor | null;
  name: string;
  size?: number;
}>();

const style = computed(() => ({
  background: AVATAR_COLOR_HEX[props.color ?? DEFAULT_AVATAR_COLOR],
  ...(props.size ? { "--avatar-size": `${props.size}px` } : {}),
}));
const glyph = computed(() => props.emoji?.trim() || avatarInitial(props.name));
</script>

<template>
  <span
    class="avatar inline-flex shrink-0 items-center justify-center rounded-full font-mono text-bg select-none"
    :style="style"
    aria-hidden="true"
  >
    {{ glyph }}
  </span>
</template>

<style scoped>
.avatar {
  width: var(--avatar-size, 40px);
  height: var(--avatar-size, 40px);
  font-size: calc(var(--avatar-size, 40px) * 0.5);
}
</style>
