// ========================================
// FONCTIONS COMPLETES RECUPEREES DE L'ANCIEN DEVELOPERDASHBOARD
// ========================================

// 1. HANDLEPROJECTFOLDERIMPORT - Import de dossier de projet complet
const handleProjectFolderImport = async (event: ChangeEvent<HTMLInputElement>) => {
  const selectedFiles = Array.from(event.target.files ?? []);
  event.target.value = "";
  if (selectedFiles.length === 0) {
    return;
  }

  setIsImportingProject(true);
  setFormError(null);

  try {
    const acceptedFiles: ImportedProjectFile[] = [];
    let ignoredFiles = 0;
    let totalBytes = 0;
    let folderName = "local-project";

    for (const file of selectedFiles) {
      const importPath = getFolderImportPath(file);
      if (!importPath) {
        ignoredFiles += 1;
        continue;
      }

      folderName = importPath.rootFolderName || folderName;

      if (
        shouldIgnoreImportedPath(importPath.relativePath) ||
        file.size > MAX_IMPORTED_FILE_BYTES ||
        acceptedFiles.length >= MAX_IMPORTED_PROJECT_FILES
      ) {
        ignoredFiles += 1;
        continue;
      }

      const nextTotalBytes = totalBytes + file.size;
      if (nextTotalBytes > MAX_IMPORTED_TOTAL_BYTES) {
        ignoredFiles += 1;
        continue;
      }

      const importedText = await file.text();
      if (!isTextContent(importedText)) {
        ignoredFiles += 1;
        continue;
      }

      acceptedFiles.push({
        path: importPath.relativePath,
        content: importedText,
      });
      totalBytes = nextTotalBytes;
    }

    if (acceptedFiles.length === 0) {
      throw new Error("Aucun fichier texte exploitable n'a ete trouve dans le dossier selectionne.");
    }

    const syntheticDiff = synthesizeFolderSnapshotDiff(acceptedFiles);
    const diffBytes = textEncoder.encode(syntheticDiff).length;
    if (diffBytes > MAX_SYNTHETIC_DIFF_BYTES) {
      throw new Error(
        `Le snapshot du dossier depasse la taille maximale analysee (${formatBytes(diffBytes)} > ${formatBytes(MAX_SYNTHETIC_DIFF_BYTES)}).`,
      );
    }

    setDiffInput(syntheticDiff);
    setImportedProjectSummary({
      folderName,
      importedFiles: acceptedFiles.length,
      ignoredFiles,
      totalBytes,
      diffBytes,
    });
    if (!repoInput.trim()) {
      const inferredRepo = folderName.replace(/\s+/g, "-");
      if (inferredRepo.trim()) {
        setRepoInput(inferredRepo.trim());
      }
    }

    setAnalysisDialogOpen(true);
    setActionMessage(
      `Dossier importe: ${folderName} (${acceptedFiles.length} fichiers, ${formatBytes(totalBytes)} de texte utile).`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import du dossier impossible.";
    setFormError(message);
  } finally {
    setIsImportingProject(false);
  }
};

// 2. HANDLELAUNCHANALYSIS - Lancement d'analyse complète
const handleLaunchAnalysis = async () => {
  setFormError(null);
  setActionMessage(null);

  const normalizedRepo = repoInput.trim();
  const normalizedDiff = diffInput.trim();
  const normalizedPrNumber = prNumberInput.trim();
  const normalizedCommitSha = commitShaInput.trim();

  if (!normalizedRepo) {
    setFormError("Le repository est obligatoire.");
    return;
  }

  let parsedPrNumber: number | null = null;
  if (normalizedPrNumber.length > 0) {
    const asNumber = Number(normalizedPrNumber);
    if (!Number.isInteger(asNumber) || asNumber < 1) {
      setFormError("Le numero de PR doit etre un entier positif.");
      return;
    }
    parsedPrNumber = asNumber;
  }

  if (normalizedCommitSha.length > 0 && !/^[0-9a-fA-F]{6,64}$/.test(normalizedCommitSha)) {
    setFormError("Le commit SHA doit contenir 6 a 64 caracteres hexadecimaux.");
    return;
  }

  const isGithubRemoteMode = githubRepoSelection !== "manual" && importedProjectSummary === null;
  const hasGithubTarget = parsedPrNumber !== null || normalizedCommitSha.length > 0;
  const githubRemoteTargetMode = isGithubRemoteMode
    ? parsedPrNumber !== null
      ? "pr"
      : normalizedCommitSha.length > 0
        ? "commit"
        : "repo_snapshot"
    : null;

  if (!normalizedDiff && !isGithubRemoteMode) {
    setFormError("Importez un dossier de code ou collez un diff avant de lancer l'analyse.");
    return;
  }

  setIsSubmittingAnalysis(true);
  try {
    const response = await fetch("/api/dashboard/analyses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        repo: normalizedRepo,
        pr_number: parsedPrNumber,
        commit_sha: normalizedCommitSha.length > 0 ? normalizedCommitSha : null,
        diff_text: normalizedDiff.length > 0 ? normalizedDiff : null,
        metadata: {
          triggered_from: "developer_dashboard",
          imported_diff: true,
          imported_file_name: importedProjectSummary?.folderName ?? null,
          import_mode: importedProjectSummary ? "folder" : isGithubRemoteMode ? "github_remote" : "manual_diff",
          analysis_input_mode: importedProjectSummary
            ? "local_folder_snapshot"
            : isGithubRemoteMode
              ? "github_remote"
              : "manual_diff",
          workspace_source: importedProjectSummary
            ? "imported_folder_snapshot"
            : isGithubRemoteMode
              ? "github_remote"
              : "manual_diff",
          imported_folder_name: importedProjectSummary?.folderName ?? null,
          imported_files_count: importedProjectSummary?.importedFiles ?? null,
          ignored_files_count: importedProjectSummary?.ignoredFiles ?? null,
          imported_text_bytes: importedProjectSummary?.totalBytes ?? null,
          synthetic_diff_bytes: importedProjectSummary?.diffBytes ?? null,
          repo_selected_from_github: githubRepoSelection !== "manual",
          selected_github_repo: githubRepoSelection !== "manual" ? githubRepoSelection : null,
          github_remote_target_mode: githubRemoteTargetMode,
          github_remote_has_pr_or_commit: hasGithubTarget,
        },
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as LaunchAnalysisResponse;
    if (!response.ok) {
      const backendMessage =
        payload?.backend_response?.message ??
        payload?.backend_response?.detail ??
        payload?.error ??
        "Le backend a refuse la creation de l'analyse.";
      throw new Error(backendMessage);
    }

    const analysisId = typeof payload.analysis_id === "string" ? payload.analysis_id : null;
    setActionMessage(
      analysisId
        ? `Analyse lancee avec succes. ID: ${analysisId}`
        : "Analyse lancee avec succes.",
    );
    setAnalysisDialogOpen(false);
    setPrNumberInput("");
    setCommitShaInput("");
    setImportedProjectSummary(null);
    setGithubRepoSelection("manual");
    await refreshDashboardData();
    router.refresh();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible de lancer l'analyse.";
    setFormError(message);
  } finally {
    setIsSubmittingAnalysis(false);
  }
};

// 3. REFRESHDASHBOARDDATA - Rafraîchissement des données du dashboard
const refreshDashboardData = async () => {
  setInsightsLoading(true);
  try {
    const [insightsPayload, analysesPayload] = await Promise.all([
      fetchDashboardInsights(),
      fetchDashboardAnalyses({ force: true, size: 40 }),
    ]);
    setInsights(insightsPayload);
    setAnalysisRows(analysesPayload);
  } finally {
    setInsightsLoading(false);
  }
};

// 4. LOADGITHUBREPOS - Chargement des repositories GitHub
const loadGithubRepos = async () => {
  setIsLoadingGithubRepos(true);
  setGithubReposError(null);
  try {
    const response = await fetch("/api/dashboard/github/repos", {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Impossible de recuperer les repositories GitHub.");
    }

    const payload = (await response.json().catch(() => ({}))) as GithubReposResponse;
    const items = Array.isArray(payload.items) ? payload.items : [];
    setGithubRepos(items);
    setGithubConnected(payload.connected === true);
    if (typeof payload.error === "string" && payload.error.trim().length > 0) {
      setGithubReposError(payload.error);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chargement des repositories GitHub impossible.";
    setGithubRepos([]);
    setGithubConnected(false);
    setGithubReposError(message);
  } finally {
    setIsLoadingGithubRepos(false);
  }
};

// ========================================
// USEEFFECT HOOKS MANQUANTS
// ========================================

// 1. UseEffect principal - Chargement initial des données
useEffect(() => {
  let cancelled = false;
  setInsightsLoading(true);
  Promise.all([fetchDashboardInsights(), fetchDashboardAnalyses({ force: true, size: 40 })])
    .then(([insightsPayload, analysesPayload]) => {
      if (cancelled) {
        return;
      }
      setInsights(insightsPayload);
      setAnalysisRows(analysesPayload);
    })
    .finally(() => {
      if (!cancelled) {
        setInsightsLoading(false);
      }
    });
  return () => {
    cancelled = true;
  };
}, []);

// 2. UseEffect pour le rafraîchissement automatique des analyses
useEffect(() => {
  let cancelled = false;
  let isRefreshing = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const refreshAnalyses = async () => {
    if (cancelled || isRefreshing) {
      return;
    }
    let latestItems = analysisRows;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      timeoutId = setTimeout(() => {
        void refreshAnalyses();
      }, 30_000);
      return;
    }
    isRefreshing = true;
    try {
      const analysesPayload = await fetchDashboardAnalyses({ force: true, size: 40 });
      latestItems = analysesPayload;
      if (!cancelled) {
        setAnalysisRows(analysesPayload);
      }
    } finally {
      isRefreshing = false;
      if (!cancelled) {
        const nextDelay = hasActiveDashboardAnalysis(latestItems) ? 10_000 : 30_000;
        timeoutId = setTimeout(() => {
          void refreshAnalyses();
        }, nextDelay);
      }
    }
  };

  timeoutId = setTimeout(() => {
    void refreshAnalyses();
  }, hasActiveDashboardAnalysis(analysisRows) ? 10_000 : 30_000);

  return () => {
    cancelled = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
}, [analysisRows]);

// 3. UseEffect pour configurer l'input de dossier
useEffect(() => {
  const input = projectFolderInputRef.current;
  if (!input) {
    return;
  }
  input.setAttribute("webkitdirectory", "");
  input.setAttribute("directory", "");
}, []);

// 4. UseEffect pour charger les repos GitHub quand le dialog s'ouvre
useEffect(() => {
  if (!analysisDialogOpen) {
    return;
  }
  void loadGithubRepos();
}, [analysisDialogOpen]);

// 5. UseEffect pour valider la sélection de repo GitHub
useEffect(() => {
  if (githubRepoSelection === "manual") {
    return;
  }
  const stillExists = githubRepos.some((repo) => repo.fullName === githubRepoSelection);
  if (!stillExists) {
    setGithubRepoSelection("manual");
  }
}, [githubRepoSelection, githubRepos]);