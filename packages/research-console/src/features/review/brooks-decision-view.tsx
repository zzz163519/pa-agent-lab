import type { BrooksDecisionV1 } from "@pa-agent-lab/contracts";

function label(value: string): string {
  return value.replaceAll("_", " ");
}

export function BrooksDecisionView(props: { readonly decision: BrooksDecisionV1 }) {
  const decision = props.decision;
  const doctrineIds = Array.from(
    new Set(decision.claims.flatMap((claim) => claim.doctrineIds)),
  ).sort();
  return (
    <section className="decision-view" aria-labelledby="brooks-decision-title">
      <header className="section-heading">
        <div>
          <p className="eyebrow">Revealed record</p>
          <h2 id="brooks-decision-title">BrooksDecision</h2>
        </div>
        <span className={`verdict verdict-${decision.verdict}`}>
          {label(decision.verdict)}
        </span>
      </header>

      {decision.humanSummary !== null ? (
        <p className="decision-summary">{decision.humanSummary}</p>
      ) : null}
      <div className="record-identities decision-identities">
        <span>Decision</span>
        <code>{decision.decisionId}</code>
        <code>{decision.decisionHash}</code>
      </div>

      <div className="semantic-grid">
        <SemanticField label="Market" value={decision.broadContext.marketState} />
        <SemanticField label="Trend" value={decision.broadContext.trendDirection} />
        <SemanticField label="Current leg" value={decision.currentLeg.direction} />
        <SemanticField label="Always-in" value={decision.alwaysIn.state} />
        <SemanticField label="Evidence" value={decision.evidenceBalance} />
        <SemanticField
          label="Pressure"
          value={`${label(decision.pressure.buying.state)} buying / ${label(decision.pressure.selling.state)} selling`}
        />
        <SemanticField
          label="Breakout"
          value={`${label(decision.breakoutLifecycle.state)} ${label(decision.breakoutLifecycle.direction)}`}
        />
        <SemanticField
          label="Reversal"
          value={`${label(decision.reversalLifecycle.state)} to ${label(decision.reversalLifecycle.toDirection)}`}
        />
      </div>

      <div className="direction-grid">
        <DirectionalCase title="Long case" value={decision.longCase} />
        <DirectionalCase title="Short case" value={decision.shortCase} />
      </div>

      <section className="record-section">
        <h3>Decision basis</h3>
        {decision.tradePlan !== null ? (
          <KeyValueRecord value={decision.tradePlan} />
        ) : decision.noTrade !== null ? (
          <KeyValueRecord value={decision.noTrade} />
        ) : decision.uncertainty !== null ? (
          <KeyValueRecord value={decision.uncertainty} />
        ) : null}
      </section>

      <section className="record-section">
        <h3>Claims and evidence</h3>
        <div className="table-frame compact">
          <table>
            <thead>
              <tr>
                <th>Claim</th>
                <th>Statement</th>
                <th>Market evidence</th>
                <th>Doctrine</th>
              </tr>
            </thead>
            <tbody>
              {decision.claims.map((claim) => (
                <tr key={claim.claimId}>
                  <td className="mono">{claim.claimId}</td>
                  <td>{label(claim.statementCode)}</td>
                  <td>{claim.marketEvidenceIds.join(", ") || "None"}</td>
                  <td>{claim.doctrineIds.join(", ") || "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="record-section">
        <h3>Doctrine identities</h3>
        <div className="identity-list">
          {doctrineIds.length === 0
            ? <span className="muted">None</span>
            : doctrineIds.map((id) => <code key={id}>{id}</code>)}
        </div>
      </section>

      <details className="raw-record">
        <summary>Canonical record</summary>
        <pre>{JSON.stringify(decision, null, 2)}</pre>
      </details>
    </section>
  );
}

function SemanticField(props: { readonly label: string; readonly value: string }) {
  return (
    <div className="semantic-field">
      <span>{props.label}</span>
      <strong>{label(props.value)}</strong>
    </div>
  );
}

function DirectionalCase(props: {
  readonly title: string;
  readonly value: BrooksDecisionV1["longCase"];
}) {
  return (
    <section className="direction-case">
      <div className="direction-case-heading">
        <h3>{props.title}</h3>
        <span className={`case-state case-state-${props.value.state}`}>
          {label(props.value.state)}
        </span>
      </div>
      <dl>
        <div><dt>Balance</dt><dd>{label(props.value.evidenceBalance)}</dd></div>
        <div><dt>Signal</dt><dd>{label(props.value.signalBasis.state)}</dd></div>
        <div><dt>Trigger</dt><dd>{label(props.value.triggerState)}</dd></div>
        <div><dt>Setups</dt><dd>{props.value.setupCandidates.length}</dd></div>
      </dl>
    </section>
  );
}

function KeyValueRecord(props: { readonly value: object }) {
  return (
    <dl className="key-value-record">
      {Object.entries(props.value).map(([key, value]) => (
        <div key={key}>
          <dt>{label(key)}</dt>
          <dd>{renderValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function renderValue(value: unknown): string {
  if (value === null) return "None";
  if (Array.isArray(value)) return value.map(renderValue).join(", ") || "None";
  if (typeof value === "object") return JSON.stringify(value);
  return label(String(value));
}
