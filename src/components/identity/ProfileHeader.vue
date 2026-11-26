<script setup lang="ts">
import { computed } from "vue";
import Avatar from "./Avatar.vue";
import type { AvatarColor } from "@/shared/types/identity";

const props = defineProps<{
  identity: {
    displayName: string;
    username: string | null;
    avatarEmoji: string | null;
    avatarColor: AvatarColor | null;
    joinedAt: number;
  };
}>();

const joined = computed(() =>
  new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(
    props.identity.joinedAt,
  ),
);
</script>

<template>
  <!-- The avatar spans the rows beside it: name and handle on a phone, the stats too from sm. -->
  <header
    class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-1 border-b border-border pb-8 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
  >
    <Avatar
      :emoji="props.identity.avatarEmoji"
      :color="props.identity.avatarColor"
      :name="props.identity.displayName"
      class="row-span-2 [--avatar-size:56px] sm:(row-span-3 [--avatar-size:112px])"
    />
    <h1 class="text-2xl sm:text-3xl font-mono font-bold truncate">
      {{ props.identity.displayName }}
    </h1>
    <div class="flex items-center gap-3 text-sm font-mono text-fg-muted">
      <span v-if="props.identity.username">@{{ props.identity.username }}</span>
      <span v-if="props.identity.username" aria-hidden="true">·</span>
      <span>joined {{ joined }}</span>
    </div>
    <div v-if="$slots.meta" class="col-span-2 mt-3 sm:(col-span-1 col-start-2 mt-2)">
      <slot name="meta" />
    </div>
    <div
      v-if="$slots.aside"
      class="col-span-2 mt-3 justify-self-end flex flex-col items-end gap-2 sm:(col-span-1 col-start-3 row-start-1 row-span-3 mt-0)"
    >
      <slot name="aside" />
    </div>
  </header>
</template>
