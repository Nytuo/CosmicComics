import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import {
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import {
  DisplayBook,
  DisplaySeries,
  FieldDef,
  FieldSchema,
} from '@/interfaces/IDisplayBook.ts';
import * as TauriAPI from '@/API/TauriAPI.ts';
import { ToasterHandler } from '../../common/ToasterHandler.tsx';
import { t } from 'i18next';

type BookOrSeries = DisplayBook | DisplaySeries;

/**
 * A skeleton component for editing a book or series in the database.
 * Uses FieldSchema from the backend to dynamically render form fields.
 * @param TheBook - The book or series to edit (null when creating a new manual entry).
 * @param type - The type of item being edited ('book' or 'series').
 * @param providerId - Provider ID for fetching the field schema (defaults to 0 = Manual).
 * @param triggerSend - A flag that triggers sending the edited data to the server.
 * @param trackedMode - A flag that indicates whether the item is being created (true) or edited (false).
 */
export default function DatabaseEditorSkeleton({
  TheBook,
  type,
  providerId = 0,
  triggerSend,
  trackedMode,
}: {
  TheBook: BookOrSeries | null;
  type: 'series' | 'book';
  providerId?: number;
  triggerSend: any;
  trackedMode?: boolean;
}) {
  const [schema, setSchema] = useState<FieldSchema | null>(null);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const getFieldValue = useCallback(
    (item: BookOrSeries, key: string): unknown => {
      if (key in item) {
        return (item as unknown as Record<string, unknown>)[key];
      }
      if (item.extra && key in item.extra) {
        return item.extra[key];
      }
      return undefined;
    },
    []
  );
  useLayoutEffect(() => {
    TauriAPI.getFieldSchema(providerId, type)
      .then((s) => {
        setSchema(s);
        if (TheBook) {
          const initial: Record<string, unknown> = {};
          for (const field of s.fields) {
            const value = getFieldValue(TheBook, field.key);
            if (value !== undefined) {
              initial[field.key] = value;
            }
          }
          setFormValues(initial);
        }
      })
      .catch((err) => {
        console.error('Failed to load field schema:', err);
        setSchema(null);
      });
  }, [TheBook, getFieldValue, providerId, type]);

  const updateField = useCallback((key: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const formValuesRef = useRef(formValues);
  formValuesRef.current = formValues;
  const trackedModeRef = useRef(trackedMode);
  trackedModeRef.current = trackedMode;
  const TheBookRef = useRef(TheBook);
  TheBookRef.current = TheBook;
  const typeRef = useRef(type);
  typeRef.current = type;

  useEffect(() => {
    if (!triggerSend) return;

    const handleInsert = async () => {
      try {
        if (typeRef.current === 'book') {
          await TauriAPI.createManualBook(formValuesRef.current);
        } else {
          await TauriAPI.createManualSeries(formValuesRef.current);
        }
        ToasterHandler(t('success'), 'success');
      } catch (err) {
        ToasterHandler(String(err), 'error');
      }
    };
    const handleUpdate = async () => {
      if (!TheBookRef.current) return;
      try {
        await TauriAPI.updateFields(
          typeRef.current === 'series' ? 'series' : 'book',
          TheBookRef.current.id,
          formValuesRef.current
        );
        ToasterHandler(t('success'), 'success');
      } catch (err) {
        ToasterHandler(String(err), 'error');
      }
    };

    if (trackedModeRef.current && TheBookRef.current === null) {
      handleInsert();
    } else {
      handleUpdate();
    }
  }, [triggerSend]);

  const renderField = (field: FieldDef) => {
    if (!field.visible) return null;
    const value = formValues[field.key];

    switch (field.field_type) {
      case 'boolean':
        return (
          <div key={field.key} className="flex items-center gap-2 my-2">
            <Checkbox
              id={`edit_${field.key}`}
              checked={!!value}
              disabled={!field.editable}
              onCheckedChange={(checked) => updateField(field.key, !!checked)}
            />
            <Label htmlFor={`edit_${field.key}`}>{field.label}</Label>
          </div>
        );

      case 'text':
        return (
          <div key={field.key} className="space-y-2 my-2">
            <Label htmlFor={`edit_${field.key}`}>{field.label}</Label>
            <Textarea
              id={`edit_${field.key}`}
              value={(value as string) ?? ''}
              disabled={!field.editable}
              placeholder={field.placeholder}
              onChange={(e) => updateField(field.key, e.target.value)}
              rows={4}
            />
          </div>
        );

      case 'number':
      case 'rating':
        return (
          <div key={field.key} className="space-y-2 my-2">
            <Label htmlFor={`edit_${field.key}`}>{field.label}</Label>
            <Input
              id={`edit_${field.key}`}
              type="number"
              value={value != null ? String(value) : ''}
              disabled={!field.editable}
              placeholder={field.placeholder}
              onChange={(e) =>
                updateField(
                  field.key,
                  e.target.value ? Number(e.target.value) : null
                )
              }
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.key} className="space-y-2 my-2">
            <Label htmlFor={`edit_${field.key}`}>{field.label}</Label>
            <Select
              value={(value as string) ?? ''}
              disabled={!field.editable}
              onValueChange={(v) => updateField(field.key, v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder ?? field.label} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'tags':
        return (
          <div key={field.key} className="space-y-2 my-2">
            <Label htmlFor={`edit_${field.key}`}>{field.label}</Label>
            <Input
              id={`edit_${field.key}`}
              type="text"
              value={
                Array.isArray(value)
                  ? (value as string[]).join(', ')
                  : ((value as string) ?? '')
              }
              disabled={!field.editable}
              placeholder={field.placeholder ?? t('comma-separated-values')}
              onChange={(e) =>
                updateField(
                  field.key,
                  e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
            />
          </div>
        );

      case 'json':
        return (
          <div key={field.key} className="space-y-2 my-2">
            <Label htmlFor={`edit_${field.key}`}>{field.label}</Label>
            <Textarea
              id={`edit_${field.key}`}
              value={
                typeof value === 'string'
                  ? value
                  : JSON.stringify(value ?? '', null, 2)
              }
              disabled={!field.editable}
              placeholder={field.placeholder}
              onChange={(e) => {
                try {
                  updateField(field.key, JSON.parse(e.target.value));
                } catch {
                  updateField(field.key, e.target.value);
                }
              }}
              rows={4}
            />
          </div>
        );

      default:
        return (
          <div key={field.key} className="space-y-2 my-2">
            <Label htmlFor={`edit_${field.key}`}>{field.label}</Label>
            <Input
              id={`edit_${field.key}`}
              type={
                field.field_type === 'url'
                  ? 'url'
                  : field.field_type === 'date'
                    ? 'date'
                    : 'text'
              }
              value={(value as string) ?? ''}
              disabled={!field.editable}
              placeholder={field.placeholder}
              onChange={(e) => updateField(field.key, e.target.value)}
            />
          </div>
        );
    }
  };

  const groupedFields = schema?.fields
    .filter((f) => f.visible)
    .sort((a, b) => a.order - b.order)
    .reduce(
      (groups, field) => {
        const group = field.group;
        if (!groups[group]) groups[group] = [];
        groups[group].push(field);
        return groups;
      },
      {} as Record<string, FieldDef[]>
    );

  const groupLabels: Record<string, string> = {
    core: t('coreFields'),
    metadata: t('metadata'),
    status: t('status'),
    api_specific: t('apiSpecific'),
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t('warningBeCarefulWhenYouModifyThoseFieldsDoNotChang')}
      </p>
      {!schema ? (
        <p className="text-sm text-muted-foreground">{t('loading')}...</p>
      ) : (
        Object.entries(groupedFields ?? {}).map(([group, fields]) => (
          <div key={group}>
            <h4 className="text-sm font-semibold mb-2">
              {groupLabels[group] ?? group}
            </h4>
            {fields.map(renderField)}
          </div>
        ))
      )}
    </div>
  );
}
