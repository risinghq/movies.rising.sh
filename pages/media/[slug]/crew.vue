<script setup lang="ts">
import { Link } from "@void/vue";
import type { Props } from "./crew.server";
import MediaHeader from "@/components/media/MediaHeader.vue";
import PersonChip from "@/components/PersonChip.vue";

const props = defineProps<Props>();

const crewPath = `/media/${props.media.slug}/crew`;

function departmentHref(department: string) {
  return `${crewPath}?department=${encodeURIComponent(department)}`;
}
</script>

<template>
  <main class="flex-1 pb-8">
    <MediaHeader :media="media" page="crew" />

    <div class="container flex flex-col gap-8 py-6 sm:py-8 lg:py-12">
      <section v-for="group in crewGroups" :key="group.department" class="flex flex-col gap-4">
        <h2 class="text-sm font-mono text-fg-muted">
          {{ group.department.toLowerCase() }} · {{ group.total }}
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <PersonChip
            v-for="member in group.members"
            :key="member.id"
            :name="member.name"
            :slug="member.slug"
            :profile-path="member.profilePath"
            :subtitle="member.job"
          />
        </div>
        <Link
          v-if="group.members.length < group.total"
          :href="departmentHref(group.department)"
          class="self-start text-[0.7rem] font-mono text-fg-subtle hover:text-fg"
        >
          all {{ group.total }} in {{ group.department.toLowerCase() }}
        </Link>
        <Link
          v-else-if="group.department === expanded"
          :href="crewPath"
          class="self-start text-[0.7rem] font-mono text-fg-subtle hover:text-fg"
        >
          show fewer
        </Link>
      </section>

      <p v-if="crewGroups.length === 0" class="font-mono text-sm text-fg-muted">
        no crew recorded for this title.
      </p>
    </div>
  </main>
</template>
