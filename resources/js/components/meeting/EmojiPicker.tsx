import data from "@emoji-mart/data"
import Picker from "@emoji-mart/react"

interface EmojiPickerProps {
  onEmojiSelect: (emoji: any) => void
  theme?: "light" | "dark" | "auto"
  className?: string
}

export default function EmojiPicker({ onEmojiSelect, theme = "light", className = "" }: EmojiPickerProps) {
  return (
    <div className={className}>
      <Picker
        data={data}
        onEmojiSelect={onEmojiSelect}
        theme={theme}
        previewPosition="none"
        skinTonePosition="none"
        maxFrequentRows={2}
        perLine={8}
        set="native"
        emojiSize={20}
        emojiButtonSize={28}
        searchPosition="sticky"
        categories={["frequent", "people", "nature", "foods", "activity", "places", "objects", "symbols", "flags"]}
      />
    </div>
  )
}
