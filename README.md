# PA Agent Lab

PA Agent Lab 是一个独立的 Price Action agent 研究项目。

它的长期目标分为两个阶段：

1. 建立对 Al Brooks Price Action 架构的可追溯理解，并由 Brooks Policy Agent 形成完整、因果、可审计的研究交易判断；Calvin 只提供离线审阅、解释和歧义裁定；
2. 在冻结的 Brooks 基线之上，让独立 Research Agent 提出和验证新的交易假设与机会。

本项目不是 CITA 的新版本，也不是 `vegas-ema-cta-lab` 的 V7。现有 Vegas/CITA 策略、结果、权限和历史 artifacts 不会自动成为本项目的策略权威。

## Current Status

治理仓库和架构记录已经建立。Phase 1 已实现模型调用调度、候选对称性、冻结结果缓存、因果 Case、匿名 120/40 输入、外发隐私、ModelRun/ProviderAttempt/Audit，以及 BrooksDecision、简化 DoctrineUnit、整条决策级 CalvinReview 和确定性 Conflict 合同。持久化 API、前端、实际 RAG、模型 provider、训练和回放仍未实现。

本项目不具备 Paper、Live、交易所提交、下单或真实资金权限。

## Authoritative Documents

- [项目章程](docs/plans/PA_AGENT_LAB_CHARTER_V1.md)
- [技术架构草案](docs/plans/PA_AGENT_LAB_ARCHITECTURE_V1.md)
- [实现顺序草案](docs/plans/PA_AGENT_LAB_IMPLEMENTATION_SEQUENCE_V1.md)
- [开放决策](docs/plans/OPEN_DECISIONS.md)
- [ADR-0001: 独立仓库边界](docs/decisions/ADR-0001-INDEPENDENT-REPOSITORY.md)
- [ADR-0002: 语义轨道隔离（部分被 ADR-0003 取代）](docs/decisions/ADR-0002-SEMANTIC-AUTHORITY-TRACKS.md)
- [ADR-0003: Brooks 运行时权威与 Calvin 离线审阅](docs/decisions/ADR-0003-BROOKS-RUNTIME-AUTHORITY.md)
- [ADR-0004: V6 定义只读复用](docs/decisions/ADR-0004-V6-READ-ONLY-REUSE.md)
- [ADR-0005: 多模态输入与模型择优](docs/decisions/ADR-0005-MULTIMODAL-INPUT-AND-MODEL-BAKEOFF.md)
- [ADR-0006: 本地研究平台与来源类别](docs/decisions/ADR-0006-LOCAL-PLATFORM-AND-SOURCE-CLASSES.md)
- [ADR-0007: 确定性回放平台边界](docs/decisions/ADR-0007-DETERMINISTIC-REPLAY-PLATFORM.md)
- [ADR-0008: 模型调用调度基线](docs/decisions/ADR-0008-MODEL-CALL-SCHEDULING-BASELINE.md)
- [ADR-0009: 首个 Brooks Policy 周期](docs/decisions/ADR-0009-FIRST-BROOKS-POLICY-TIMEFRAME.md)
- [ADR-0010: Brooks 决策、Doctrine 与审阅合同](docs/decisions/ADR-0010-BROOKS-DECISION-DOCTRINE-AND-REVIEW-CONTRACTS.md)
- [ADR-0011: 因果输入与 ModelRun 审计合同](docs/decisions/ADR-0011-CAUSAL-POLICY-INPUT-AND-MODEL-RUN-AUDIT.md)
- [Phase 1 语义合同 V1](docs/contracts/PHASE_1_SEMANTIC_CONTRACTS_V1.md)
- [Phase 1 输入与 ModelRun 审计 V1](docs/contracts/POLICY_INPUT_AND_MODEL_RUN_AUDIT_V1.md)
- [模型调用调度合同 V1](docs/contracts/MODEL_CALL_SCHEDULING_V1.md)
- [V6 只读复用清单](docs/plans/V6_READ_ONLY_REUSE_INVENTORY_V1.md)

`AGENTS.md` 定义所有 agent 在本仓库中必须遵守的研究和编辑边界。

## Development

当前合同切片使用 Node 24、pnpm 10 和严格 TypeScript，无运行时依赖。

```bash
pnpm install
pnpm test
pnpm typecheck
```
