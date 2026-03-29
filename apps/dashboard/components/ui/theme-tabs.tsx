import { cn } from "@/components/ui/utils"
import { Theme } from "@/components/ui/theme"

export const ThemeTabs = () => {
  return (
    <div className="flex items-center gap-3">
      <Theme
        variant="tabs"
        size="sm"
        themes={["light", "dark", "system"]}
      />
      <Theme
        variant="tabs"
        size="md"
        showLabel
        themes={["light", "dark", "system"]}
      />
    </div>
  )
}

export default ThemeTabs
