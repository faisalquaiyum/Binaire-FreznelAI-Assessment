import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Content,
  Dialog,
  DialogTrigger,
  Form,
  Heading,
  Item,
  Picker,
  ProgressCircle,
  NumberField,
  SearchField,
  Text,
  TextField,
} from "@adobe/react-spectrum";
import {
  Check,
  Cloud,
  CloudOff,
  LogIn,
  LogOut,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import { ModelRepository, fallbackModels } from "./api/ModelRepository";
import { AuthService } from "./auth/AuthService";
import { ModelCatalog } from "./models/ModelCatalog";
import type { ModelFilters, ModelRecord, SortOption } from "./types/model";

const repository = new ModelRepository();
const authService = new AuthService();
const initialFilters: ModelFilters = {
  pipeline: "all",
  family: "all",
  architecture: "all",
  weight: "all",
  safetensorMin: 0,
  safetensorMax: 1000,
};

export function App() {
  const [models, setModels] = useState<ModelRecord[]>(fallbackModels);
  const [nameQuery, setNameQuery] = useState("");
  const [familyQuery, setFamilyQuery] = useState("");
  const [filters, setFilters] = useState<ModelFilters>(initialFilters);
  const [sort, setSort] = useState<SortOption>("downloads-desc");
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [fromCache, setFromCache] = useState(true);
  const [user, setUser] = useState<{
    displayName?: string | null;
    email?: string | null;
  } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const lastFetchAt = useRef(0);

  useEffect(() => authService.watch(setUser), []);

  useEffect(() => {
    const online = () => setOffline(false);
    const offlineEvent = () => setOffline(true);
    window.addEventListener("online", online);
    window.addEventListener("offline", offlineEvent);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offlineEvent);
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    let refreshTimer: number | undefined;
    const timer = window.setTimeout(() => {
      const throttleWait = Math.max(
        0,
        500 - (Date.now() - lastFetchAt.current),
      );
      refreshTimer = window.setTimeout(() => {
        lastFetchAt.current = Date.now();
        repository
          .fetchModels(nameQuery || familyQuery)
          .then((result) => {
            setModels(result.models);
            setFromCache(result.fromCache);
            setLoading(false);
          })
          .catch((error: unknown) => {
            if (!(error instanceof DOMException && error.name === "AbortError"))
              setLoading(false);
          });
      }, throttleWait);
    }, 380);
    return () => {
      window.clearTimeout(timer);
      if (refreshTimer) window.clearTimeout(refreshTimer);
    };
  }, [nameQuery, familyQuery]);

  const catalog = useMemo(() => new ModelCatalog(models), [models]);
  const visibleModels = useMemo(
    () => catalog.select({ nameQuery, familyQuery, filters, sort }),
    [catalog, nameQuery, familyQuery, filters, sort],
  );
  const options = useMemo(
    () => ({
      pipelines: [...new Set(models.map((model) => model.pipelineTag))].sort(),
      families: [...new Set(models.map((model) => model.family))].sort(),
      architectures: [
        ...new Set(models.map((model) => model.architecture)),
      ].sort(),
      weights: [
        ...new Set(
          models
            .map((model) => model.weightFormat)
            .filter((weight) => weight !== "Unspecified"),
        ),
      ].sort(),
    }),
    [models],
  );

  const toggleSelected = (id: string) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  const updateFilter = (key: keyof ModelFilters, value: string | number) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const clearFilters = () => {
    setFilters(initialFilters);
    setNameQuery("");
    setFamilyQuery("");
  };

  const submitAuth = () => {
    setAuthBusy(true);
    setAuthError(null);
    const action =
      authMode === "sign-up"
        ? authService.signUp(authEmail, authPassword)
        : authService.signInWithEmail(authEmail, authPassword);
    action
      .then(() => setShowAuth(false))
      .catch((error: unknown) =>
        setAuthError(authService.getErrorMessage(error, "password")),
      )
      .finally(() => setAuthBusy(false));
  };

  const signInWithGoogle = () => {
    setAuthBusy(true);
    setAuthError(null);
    authService
      .signInWithGoogle()
      .then(() => setShowAuth(false))
      .catch((error: unknown) =>
        setAuthError(authService.getErrorMessage(error, "google")),
      )
      .finally(() => setAuthBusy(false));
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark">
            <span>F</span>
            <i />
          </span>
          <span className="brand-name">
            <strong>FREZNEL</strong>
            <em>AI / by Faisal</em>
          </span>
        </a>
        <div className="topbar-actions">
          <span className={`connection ${offline ? "is-offline" : ""}`}>
            <span className="status-dot" />
            {offline ? "Offline mode" : "Live API"}
            {fromCache && <small> / cached</small>}
          </span>
          {user ? (
            <button
              className="user-chip"
              onClick={() => authService.signOut()}
              title="Sign out"
            >
              <span>{user.displayName?.charAt(0) || "D"}</span>
              {user.displayName}
              <LogOut size={14} />
            </button>
          ) : (
            <DialogTrigger isOpen={showAuth} onOpenChange={setShowAuth}>
              <Button
                variant="secondary"
                onPress={() => {
                  setAuthMode("sign-in");
                  setAuthError(null);
                }}
              >
                <LogIn size={15} /> Sign in
              </Button>
              <AuthDialog
                mode={authMode}
                email={authEmail}
                password={authPassword}
                busy={authBusy}
                error={authError}
                configured={authService.isConfigured}
                onEmailChange={setAuthEmail}
                onPasswordChange={setAuthPassword}
                onModeChange={(mode) => {
                  setAuthMode(mode);
                  setAuthError(null);
                }}
                onSubmit={submitAuth}
                onGoogle={signInWithGoogle}
                onClose={() => setShowAuth(false)}
              />
            </DialogTrigger>
          )}
        </div>
      </header>

      <main>
        <section className="intro">
          <div>
            <p className="eyebrow">FREZNEL AI / MODEL DISCOVERY</p>
            <h1>
              Choose the model
              <br />
              <i>for the work.</i>
            </h1>
          </div>
          <p className="intro-copy">
            Search an evolving catalog of open models, then compare capability,
            architecture, weight, and file footprint before you commit.
          </p>
        </section>

        <section className="workspace">
          <div className="workspace-heading">
            <div>
              <p className="eyebrow">MODEL CATALOG</p>
              <h2>Search the index</h2>
            </div>
            <span>Filter by capability, family, architecture, or weight.</span>
          </div>
          <div className="search-row">
            <SearchField
              aria-label="Search model name or ID"
              UNSAFE_className="search-box"
              value={nameQuery}
              onChange={setNameQuery}
              placeholder="Search model name or ID..."
            />
            <SearchField
              aria-label="Search model family"
              UNSAFE_className="family-search"
              label="FAMILY"
              value={familyQuery}
              onChange={setFamilyQuery}
              placeholder="Any family"
            />
            <Button
              variant={showFilters ? "accent" : "primary"}
              UNSAFE_className={`filter-toggle ${showFilters ? "active" : ""}`}
              onPress={() => setShowFilters((current) => !current)}
            >
              <SlidersHorizontal size={17} /> Filters{" "}
              <span>
                {Object.values(filters).filter(
                  (value) => value !== "all" && value !== 0 && value !== 1000,
                ).length || ""}
              </span>
            </Button>
          </div>
          {showFilters && (
            <aside className="filter-panel">
              <FilterSelect
                label="Pipeline"
                value={filters.pipeline}
                options={options.pipelines}
                onChange={(value) => updateFilter("pipeline", value)}
              />
              <FilterSelect
                label="Family tag"
                value={filters.family}
                options={options.families}
                onChange={(value) => updateFilter("family", value)}
              />
              <FilterSelect
                label="Architecture"
                value={filters.architecture}
                options={options.architectures}
                onChange={(value) => updateFilter("architecture", value)}
              />
              <FilterSelect
                label="Weight"
                value={filters.weight}
                options={options.weights}
                onChange={(value) => updateFilter("weight", value)}
              />
              <div className="range-field">
                <span>Safetensor files</span>
                <div>
                  <NumberField
                    aria-label="Minimum safetensor files"
                    UNSAFE_className="range-number"
                    minValue={0}
                    value={filters.safetensorMin}
                    onChange={(value) => updateFilter("safetensorMin", value)}
                  />
                  <b>to</b>
                  <NumberField
                    aria-label="Maximum safetensor files"
                    UNSAFE_className="range-number"
                    minValue={0}
                    value={filters.safetensorMax}
                    onChange={(value) => updateFilter("safetensorMax", value)}
                  />
                </div>
              </div>
              <button className="clear-button" onClick={clearFilters}>
                <X size={14} /> Clear all
              </button>
            </aside>
          )}
          <div className="list-header">
            <span>
              <strong>{visibleModels.length}</strong> models indexed
            </span>
            <Picker
              aria-label="Sort models"
              label="SORT BY"
              UNSAFE_className="sort-select"
              selectedKey={sort}
              onSelectionChange={(key) => setSort(String(key) as SortOption)}
              items={[
                { key: "downloads-desc", label: "Most downloaded" },
                { key: "files-asc", label: "Safetensor files, low to high" },
                { key: "files-desc", label: "Safetensor files, high to low" },
                { key: "name-asc", label: "Name, A to Z" },
                { key: "name-desc", label: "Name, Z to A" },
              ]}
            >
              {(item) => <Item key={item.key}>{item.label}</Item>}
            </Picker>
          </div>
          <div className="model-list">
            {loading && (
              <div className="loading-line">
                <span />
                Refreshing the index...
              </div>
            )}
            {!loading &&
              visibleModels.map((model, index) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  rank={index + 1}
                  selected={selected.includes(model.id)}
                  onSelect={() => toggleSelected(model.id)}
                />
              ))}
            {!loading && visibleModels.length === 0 && (
              <div className="empty-state">
                No models match this combination of filters.
                <button onClick={clearFilters}>Reset search</button>
              </div>
            )}
          </div>
          {selected.length > 0 && (
            <ComparisonPanel
              models={models.filter((model) => selected.includes(model.id))}
              onClear={() => setSelected([])}
            />
          )}
        </section>
      </main>
      <footer>
        <span>
          <Cloud size={14} />{" "}
          {offline
            ? "Working from your local index"
            : "Synced with the public model API"}
        </span>
        <span>
          {selected.length
            ? `${selected.length} selected for comparison`
            : "Select models to compare"}
        </span>
        <span className="signature">Built by Faisal</span>
      </footer>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const items = [
    { key: "all", label: "All" },
    ...options.map((option) => ({ key: option, label: option })),
  ];

  return (
    <label className="filter-select">
      <span>{label}</span>
      <div>
        <Picker
          aria-label={label}
          selectedKey={value}
          onSelectionChange={(key) => onChange(String(key))}
          items={items}
          width="100%"
        >
          {(item) => (
            <Item key={item.key} textValue={item.label}>
              {item.label}
            </Item>
          )}
        </Picker>
      </div>
    </label>
  );
}

function AuthDialog({
  mode,
  email,
  password,
  busy,
  error,
  configured,
  onEmailChange,
  onPasswordChange,
  onModeChange,
  onSubmit,
  onGoogle,
  onClose,
}: {
  mode: "sign-in" | "sign-up";
  email: string;
  password: string;
  busy: boolean;
  error: string | null;
  configured: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onModeChange: (mode: "sign-in" | "sign-up") => void;
  onSubmit: () => void;
  onGoogle: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog size="S">
      <Heading>
        {mode === "sign-up" ? "Create your account" : "Welcome back"}
      </Heading>
      <Button
        variant="secondary"
        onPress={onClose}
        aria-label="Close authentication dialog"
      >
        <X size={16} />
      </Button>
      <Content>
        <Text>
          {configured
            ? "Use Firebase Authentication to save your model workspace."
            : "Firebase configuration is missing from this environment."}
        </Text>
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={onEmailChange}
            isRequired
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={onPasswordChange}
            isRequired
          />
          <div>
            {error && <Text UNSAFE_className="auth-error">{error}</Text>}
          </div>
          <Button
            type="submit"
            variant="accent"
            isDisabled={busy || !configured}
          >
            {busy ? (
              <ProgressCircle size="S" isIndeterminate />
            ) : mode === "sign-up" ? (
              "Create account"
            ) : (
              "Sign in"
            )}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onPress={onGoogle}
            isDisabled={busy || !configured}
          >
            Continue with Google
          </Button>
        </Form>
        <Button
          variant="secondary"
          onPress={() =>
            onModeChange(mode === "sign-up" ? "sign-in" : "sign-up")
          }
        >
          {mode === "sign-up"
            ? "Already have an account? Sign in"
            : "Need an account? Sign up"}
        </Button>
      </Content>
    </Dialog>
  );
}

function ModelCard({
  model,
  rank,
  selected,
  onSelect,
}: {
  model: ModelRecord;
  rank: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <article className={`model-card ${selected ? "selected" : ""}`}>
      <div className="rank">{String(rank).padStart(2, "0")}</div>
      <div className="model-main">
        <div className="model-title">
          <h2>{model.name}</h2>
          <span className="verified">
            <Check size={11} />
          </span>
        </div>
        <p className="model-id">{model.id}</p>
        <div className="tag-row">
          <span className="tag accent">{model.pipelineTag}</span>
          <span className="tag">{model.family}</span>
          <span className="tag">{model.weightFormat}</span>
          <span className="tag">{model.architecture}</span>
        </div>
      </div>
      <div className="model-stats">
        <span>
          <strong>{model.safetensorFiles ?? "TBD"}</strong> safetensors
        </span>
        <span>{model.useCase}</span>
        <span>
          <Star size={13} fill="currentColor" /> {formatCount(model.likes)}
        </span>
      </div>
      <button
        className={`select-button ${selected ? "checked" : ""}`}
        onClick={onSelect}
        aria-label={`Select ${model.name}`}
      >
        {selected ? <Check size={16} /> : "+"}
      </button>
    </article>
  );
}

function ComparisonPanel({
  models,
  onClear,
}: {
  models: ModelRecord[];
  onClear: () => void;
}) {
  return (
    <section
      className="comparison-panel"
      aria-label="Selected model comparison"
    >
      <div className="comparison-heading">
        <div>
          <span className="eyebrow">COMPARISON</span>
          <strong>{models.length} selected</strong>
        </div>
        <button className="clear-button" onClick={onClear}>
          <X size={14} /> Clear selection
        </button>
      </div>
      <div className="comparison-grid">
        {models.map((model) => (
          <article key={model.id} className="comparison-item">
            <h3>{model.name}</h3>
            <p>{model.family}</p>
            <dl>
              <div>
                <dt>Pipeline</dt>
                <dd>{model.pipelineTag}</dd>
              </div>
              <div>
                <dt>Architecture</dt>
                <dd>{model.architecture}</dd>
              </div>
              <div>
                <dt>Weight</dt>
                <dd>{model.weightFormat}</dd>
              </div>
              <div>
                <dt>Safetensors</dt>
                <dd>{model.safetensorFiles ?? "TBD"}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatCount(value: number): string {
  return value >= 1000000
    ? `${(value / 1000000).toFixed(1)}M`
    : value >= 1000
      ? `${(value / 1000).toFixed(1)}K`
      : String(value);
}
