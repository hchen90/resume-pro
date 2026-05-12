import type { ResumeNode, ResumeWithNodes } from "@/lib/resume/types";

export function summarizeResume(resume: ResumeWithNodes, selectedNodeId?: string) {
  const selectedNode = resume.nodes.find((node) => node.id === selectedNodeId);

  return JSON.stringify(
    {
      resume: {
        id: resume.id,
        title: resume.title,
        templateId: resume.templateId,
      },
      selectedNode: selectedNode ? summarizeNode(selectedNode) : null,
      nodes: resume.nodes
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(summarizeNode),
    },
    null,
    2,
  );
}

function summarizeNode(node: ResumeNode) {
  return {
    id: node.id,
    type: node.type,
    title: node.title,
    enabled: node.enabled,
    content: node.content,
  };
}
