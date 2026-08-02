# PA Agent Lab

PA Agent Lab 是一个独立的 Price Action agent 研究项目。

它的长期目标分为两个阶段：

1. 建立对 Al Brooks Price Action 架构的可追溯理解，并从 Calvin 的盲态案例中学习如何把教义应用到具体行情；
2. 在冻结的基线之上，让独立 Research Agent 提出和验证新的交易假设与机会。

本项目不是 CITA 的新版本，也不是 `vegas-ema-cta-lab` 的 V7。现有 Vegas/CITA 策略、结果、权限和历史 artifacts 不会自动成为本项目的策略权威。

## Current Status

当前只完成治理仓库初始化和架构记录。尚未实现 API、前端、RAG、模型调用、训练、回放或交易功能。

本项目不具备 Paper、Live、交易所提交、下单或真实资金权限。

## Authoritative Documents

- [项目章程](docs/plans/PA_AGENT_LAB_CHARTER_V1.md)
- [技术架构草案](docs/plans/PA_AGENT_LAB_ARCHITECTURE_V1.md)
- [实现顺序草案](docs/plans/PA_AGENT_LAB_IMPLEMENTATION_SEQUENCE_V1.md)
- [开放决策](docs/plans/OPEN_DECISIONS.md)
- [ADR-0001: 独立仓库边界](docs/decisions/ADR-0001-INDEPENDENT-REPOSITORY.md)
- [ADR-0002: 三轨语义权威](docs/decisions/ADR-0002-SEMANTIC-AUTHORITY-TRACKS.md)

`AGENTS.md` 定义所有 agent 在本仓库中必须遵守的研究和编辑边界。
