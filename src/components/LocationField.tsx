import { View } from "react-native";

import { FormField } from "@/components/FormField";
import { LOCATION_ADDRESS_MAX, LOCATION_NAME_MAX } from "@/lib/maps";
import { spacing } from "@/theme";

interface LocationFieldProps {
  name: string;
  address: string;
  onChangeName: (value: string) => void;
  onChangeAddress: (value: string) => void;
  /** Label for the first input, e.g. "Store name" or "Venue". */
  nameLabel: string;
  namePlaceholder: string;
  addressPlaceholder?: string;
  required?: boolean;
  /** Defaults to `required`. Events need a venue name but not a street address. */
  addressRequired?: boolean;
  hint?: string;
}

/** Name + street address pair. Students open it in Maps from the detail page. */
export function LocationField({
  name,
  address,
  onChangeName,
  onChangeAddress,
  nameLabel,
  namePlaceholder,
  addressPlaceholder = "Street, city",
  required = false,
  addressRequired = required,
  hint = "Students can tap this to open it in Maps, so include the street and city.",
}: LocationFieldProps) {
  return (
    <View style={{ gap: spacing.lg }}>
      <FormField
        label={`${nameLabel}${required ? "" : " (Optional)"}`}
        value={name}
        onChangeText={onChangeName}
        placeholder={namePlaceholder}
        maxLength={LOCATION_NAME_MAX}
      />
      <FormField
        label={`Address${addressRequired ? "" : " (Optional)"}`}
        value={address}
        onChangeText={onChangeAddress}
        placeholder={addressPlaceholder}
        maxLength={LOCATION_ADDRESS_MAX}
        autoCapitalize="words"
        hint={hint}
      />
    </View>
  );
}
