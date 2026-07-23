<script setup lang="ts">
import KnowledgeAttachModal from '../components/KnowledgeAttachModal.vue';

const emit = defineEmits<{ reload: [] }>();

function handleReload() {
  emit('reload');
}
</script>

<template>
  <KnowledgeAttachModal @reload="handleReload" />
</template>
