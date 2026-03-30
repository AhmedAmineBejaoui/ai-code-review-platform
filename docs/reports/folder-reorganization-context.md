
Bech n9ra structure lkol bch n3tik plan عملي ومرتب لتحسين تنظيم dossiers sans toucher lcode. Taw nabda b scan سريع للمجلدات الرئيسية وبعدها نخرجلك roadmap phases واضح.

L9it الصورة العامة, ama fama فرق صغير fel tests folder name; bech nعمل verification سريع باش plan yji based 100% 3al structure الحالية.

Context صار أوضح برشا. باش نعمل آخر scan معمّق للـ backend/app + infra + analysis_engine rules حتى نطلعلك plan واقعي على boundaries والمسؤوليات.

Hedha plan عملي based 3la structure actuelle mta3 projetek, bch twalli architecture mta3 dossiers أوضح ومنظمة:

Current Structure Diagnosis
Root فيه برشا fichiers fonctionnels + docs + scripts mixés, donc onboarding yetsabbeb confusion.
Documentation متفرقة بين root و docs بدون taxonomy ثابتة (architecture, ops, runbooks, reports).
Backend فيه layering (api/core/data/integrations/services/tasks/workers) ama boundaries mahich strict, tnajem تصير duplication responsibilities.
analysis_engine module مهم ama خارج apps/libs boundaries, ownership mta3ou مش واضح: service مستقل ولا shared library.
Scripts موجودين في scripts وزادة داخل apps، بدون conventions موحدة للتسمية والاستعمال.
Local/generated artifacts ظاهرين في structure (db, reports, caches), لازم مسار موحّد للـ runtime outputs.
Tests مركّزين principalement في backend، وما فماش structure موحّدة pour integration/e2e على مستوى monorepo.
Infra فيها local و observability حاجة باهية، ama environments strategy (local/dev/stage/prod) مش باينة في structure.
Target Folder Architecture (Proposed)
Proposed high-level tree:
apps/

backend/
dashboard/
libs/

contracts/
analysis-engine/ (if reusable by backend and future services)
shared-python/ (optional common utils)
shared-ts/ (optional UI/shared tooling)
infra/

local/
observability/
environments/
dev/
staging/
prod/
docs/

architecture/
operations/
runbooks/
decisions/
reports/
tools/

dev/
qa/
migration/
tests/

integration/
e2e/
fixtures/
tmp/

reports/

scans/

runtime/

الفكرة: apps للتطبيقات deployable، libs لأي reusable code، tools للscripts التشغيلية، tests cross-app، tmp لكل generated outputs.

Migration Plan (Phased)
Phase 1: Quick wins (low risk)

Actions:
صنّف docs في subfolders واضحة داخل docs.
أنشئ tools وانقل scripts التشغيلية من scripts تدريجيا مع aliases في Makefile.
أنشئ tmp ووجّه outputs (semgrep, db snapshots, logs) ليها.
عرف naming conventions موحّدة للدossiers والfiles.
Impact:
onboarding أسرع، project navigation أوضح، CI نظف.
Risks:
scripts paths تتكسر.
Rollback strategy:
keep compatibility wrappers: scripts قديمة تستدعي path الجديد.
Phase 2: Medium changes

Actions:
ثبّت boundaries في backend: api (transport), core (domain), data (persistence), integrations (external I/O).
اعمل extraction تدريجي لأي code reusable من backend نحو libs (مثلا analysis utilities/contracts).
وحّد test strategy: unit داخل app + integration/e2e في tests.
Impact:
coupling ينقص، tests أوضح، refactoring أسهل.
Risks:
imports breaks، circular dependencies مؤقتة.
Rollback strategy:
migrate module-by-module مع feature branches و keep old imports via compatibility layer.
Phase 3: Structural cleanup

Actions:
قرر رسميا مصير analysis_engine: يا إما service مستقل في apps، يا إما lib في libs.
أضف environments structure في infra (dev/staging/prod) مع conventions ثابتة.
أزل duplicate/manual folders بعد الترحيل (بعد verification).
Impact:
architecture stable long-term، ownership واضح بين الفرق.
Risks:
effort أكبر وتغيير habits الفريق.
Rollback strategy:
execute by milestones مع checkpoints، وإذا fails ترجع آخر milestone فقط.
Governance Rules
Naming conventions:
dossiers: kebab-case، Python modules: snake_case، TS components حسب convention الفريق.
File placement rules:
أي executable service تحت apps.
أي reusable code متعدد الاستعمال تحت libs.
أي script تشغيل/automation تحت tools.
أي generated artifact تحت tmp وممنوع في root.
Ownership boundaries:
كل top-level folder يكون عندو owner/team واضح في CODEOWNERS.
Documentation expectations:
كل folder رئيسي فيه README قصير: purpose + what belongs here + what does not.
Prioritized Checklist
صنّف docs تحت taxonomy ثابتة في docs (Priority: High, Effort: Low)
أنشئ tools + wrappers backward-compatible للscripts (High, Medium)
أنشئ tmp ووجّه runtime/generated outputs ليه (High, Low)
وثّق folder rules في repo guide واحد (High, Low)
وحّد backend boundaries بوثيقة + lint imports rules (High, Medium)
اعمل extraction تدريجي لـ reusable modules نحو libs (Medium, Medium)
أنشئ tests integration/e2e على مستوى monorepo (Medium, Medium)
حسم موقع analysis_engine النهائي (apps vs libs) (Medium, High)
نظّم infra environments structure (Medium, High)
cleanup نهائي للمجلدات المكررة/legacy بعد validation (Low, Medium)
إذا تحب، نجم في خطوة جاية نعملك version أدق: Old Path -> New Path mapping dossier par dossier باش التنفيذ يولي مباشر sprint by sprint.

ana n7ebbk enta ta3ml kol chay ma3neha ana juste netfa9ed chnoua 3malt enta w kahaw