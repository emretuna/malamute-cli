# 🐺 Malamute Architecture

## Overview

Malamute is an event-driven AI orchestration platform for repositories.

It intercepts repository lifecycle events, builds semantic context, executes specialized AI agents, aggregates results, and performs repository actions.

## High-Level Architecture

Git Event -> Malamute CLI -> Event Orchestrator
-> Context Builder
-> Policy Engine
-> Agent Router
-> Agent Execution Layer
-> Result Aggregator
-> Action Executor
-> Repository State

## Core Components

### CLI Layer

- TypeScript
- Commander.js
- Node.js

### Event Orchestrator

- Load configuration
- Trigger pipelines
- Schedule agents
- Manage retries
- Enforce budgets

### Context Builder

Inputs:

- Git diff
- Changed files
- Repository tree
- Related documentation
- Related tests

### Policy Engine

Deterministic governance for blocking, warning, or allowing actions.

### Agent Router

Maps tasks to Claude, Codex, OpenCode, Gemini, Ollama, or future ACP providers.

### Result Aggregator

Normalizes findings and produces final decisions.

### Action Executor

- Update docs
- Generate changelogs
- Create ADRs
- Apply patches
- Block commits

## Recommended Stack

- TypeScript
- Node.js
- Commander.js
- tsup
- Zod
- Execa
- Simple Git

## Mission

Malamute is the repository intelligence layer that keeps code, documentation, architecture, and team knowledge continuously synchronized through AI-native workflows.
