import { useEffect, useMemo, useState } from "react";
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
  Text,
  TextField,
} from "@adobe/react-spectrum";
import {
  Check,
  ChevronDown,
  Cloud,
  CloudOff,
  LogIn,
  LogOut,
  Search,
  SlidersHorizontal,
  Sparkles,
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
    const timer = window.setTimeout(() => {
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
    }, 380);
    return () => window.clearTimeout(timer);
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
            <Sparkles size={17} />
          </span>
          <span>
            ATLAS <em>model index</em>
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
            <p className="eyebrow">MODEL DISCOVERY / 02</p>
            <h1>
              Find the right
              <br />
              <i>intelligence.</i>
            </h1>
          </div>
          <p className="intro-copy">
            A focused index for comparing open models by capability,
            architecture, weight, and file footprint.
          </p>
        </section>

        <section className="workspace">
          <div className="search-row">
            <label className="search-box">
              <Search size={19} />
              <input
                value={nameQuery}
                onChange={(event) => setNameQuery(event.target.value)}
                placeholder="Search model name or ID..."
              />
              <kbd>⌘ K</kbd>
            </label>
            <label className="family-box">
              <span>FAMILY</span>
              <input
                value={familyQuery}
                onChange={(event) => setFamilyQuery(event.target.value)}
                placeholder="Any family"
              />
            </label>
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
                  <input
                    type="number"
                    min="0"
                    value={filters.safetensorMin}
                    onChange={(event) =>
                      updateFilter("safetensorMin", Number(event.target.value))
                    }
                  />
                  <b>to</b>
                  <input
                    type="number"
                    min="0"
                    value={filters.safetensorMax}
                    onChange={(event) =>
                      updateFilter("safetensorMax", Number(event.target.value))
                    }
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
            <label className="sort-select">
              SORT BY{" "}
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortOption)}
              >
                <option value="downloads-desc">Most downloaded</option>
                <option value="files-desc">Safetensor files</option>
                <option value="name-asc">Name, A to Z</option>
                <option value="name-desc">Name, Z to A</option>
              </select>
              <ChevronDown size={14} />
            </label>
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
      <Button variant="secondary" onPress={onClose} aria-label="Close authentication dialog">
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
          <strong>{model.safetensorFiles}</strong> safetensors
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

function formatCount(value: number): string {
  return value >= 1000000
    ? `${(value / 1000000).toFixed(1)}M`
    : value >= 1000
      ? `${(value / 1000).toFixed(1)}K`
      : String(value);
}
