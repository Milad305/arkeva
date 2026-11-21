// کتابخانهٔ کامپوننت پروژه‌یار.
//
// هر کامپوننت اینجا دقیقاً کلاس‌های kit.css بوم را emit می‌کند.
// هیچ صفحه‌ای مجاز نیست markup این‌ها را دوباره بنویسد؛ اگر چیزی لازم است
// که اینجا نیست، اول به این کتابخانه اضافه شود، نه inline در صفحه.

export { Icon, isIconName, type IconName, type IconProps } from './Icon';
export { Spinner, type SpinnerProps } from './Spinner';

export {
  AppButton,
  LinkButton,
  type AppButtonProps,
  type LinkButtonProps,
  type ButtonVariant,
  type ButtonSize,
} from './AppButton';
export { IconButton, IconLink, type IconButtonProps, type IconLinkProps } from './IconButton';

export { Badge, Delta, type BadgeProps, type DeltaProps } from './Badge';
export {
  Avatar,
  AvatarGroup,
  avatarToneFor,
  isAvatarTone,
  initialsFor,
  orgInitialsFor,
  type AvatarTone,
} from './Avatar';
export { IconBox, type IconBoxProps } from './IconBox';
export { CostTypeTag, type CostTypeTagProps } from './CostTypeTag';
export { Kbd, type KbdProps } from './Kbd';

export { Card, CardHeader, CardBody, CardFooter, Box, type CardProps } from './Card';
export { KpiCard, StatStrip, Stat, type KpiCardProps, type StatProps } from './KpiCard';
export { KeyValue, KeyValueGrid, type KeyValueProps } from './KeyValue';
export { PageHead, Breadcrumbs, type PageHeadProps, type Crumb } from './PageHead';
export { Tabs, SegmentedControl, type TabItem, type SegmentedItem } from './Tabs';

export { FormField, useFormField, type FormFieldProps } from './FormField';
export {
  TextInput,
  TextArea,
  ReadOnlyField,
  type TextInputProps,
  type TextAreaProps,
  type FieldSize,
} from './TextInput';
export { Select, type SelectProps, type SelectOption } from './Select';
export {
  Checkbox,
  Radio,
  Switch,
  OptionCard,
  type CheckboxProps,
  type SwitchProps,
  type OptionCardProps,
} from './SelectionControls';
export { Chip, type ChipProps } from './Chip';
export { Stepper, type Step, type StepperProps } from './Stepper';
export { Dropzone, type DropzoneProps } from './Dropzone';

export { ProgressBar, DualProgress, type ProgressBarProps } from './ProgressBar';
export {
  DataTable,
  type Column,
  type DataTableProps,
  type SortState,
  type ColumnAlign,
} from './DataTable';
export {
  TreeTable,
  flattenVisible,
  type TreeTableProps,
  type TreeNodeLike,
  type TreeTitleColumn,
} from './TreeTable';
export { Pagination, type PaginationProps } from './Pagination';

export { Modal, type ModalProps, type ModalSize } from './Modal';
export { ConfirmDialog, type ConfirmDialogProps, type ConfirmTone } from './ConfirmDialog';
export {
  Menu,
  MenuList,
  ContextMenu,
  type MenuEntry,
  type MenuItemSpec,
  type ContextMenuProps,
} from './Menu';
export { Tooltip, type TooltipProps } from './Tooltip';
export { Alert, type AlertProps } from './Alert';

export { Timeline, type TimelineEntry, type TimelineProps } from './Timeline';
export { Legend, type LegendEntry, type LegendProps } from './Legend';
export { PhotoThumb, Lightbox, type Photo, type PhotoThumbProps } from './PhotoThumb';
