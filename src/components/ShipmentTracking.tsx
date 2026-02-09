import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Package, Plus, Truck, MapPin, CheckCircle2, Tag, PackageCheck } from 'lucide-react';

interface Shipment {
  id: string;
  tracking_number: string;
  notes: string | null;
  carrier: string | null;
  status: string;
  created_at: string;
}

interface ShipmentTrackingProps {
  donorId: string;
  canAdd: boolean;
  isAdmin?: boolean;
}

const CARRIERS = [
  { value: 'ups', label: 'UPS' },
  { value: 'fedex', label: 'FedEx' },
  { value: 'dhl', label: 'DHL' },
  { value: 'usps', label: 'USPS' },
  { value: 'other', label: 'Other' },
];

const STATUSES = [
  { value: 'label_created', label: 'Label Created', icon: Tag, color: 'bg-gray-50 text-gray-600 border-gray-200' },
  { value: 'picked_up', label: 'Picked Up', icon: PackageCheck, color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { value: 'in_transit', label: 'In Transit', icon: Truck, color: 'bg-amber-50 text-amber-600 border-amber-200' },
  { value: 'out_for_delivery', label: 'Out for Delivery', icon: MapPin, color: 'bg-purple-50 text-purple-600 border-purple-200' },
  { value: 'delivered', label: 'Delivered', icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
];

const getStatusInfo = (status: string) => STATUSES.find((s) => s.value === status) || STATUSES[0];
const getCarrierLabel = (carrier: string | null) => CARRIERS.find((c) => c.value === carrier)?.label || carrier || '—';

const ShipmentTracking = ({ donorId, canAdd, isAdmin = false }: ShipmentTrackingProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [carrier, setCarrier] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => { fetchShipments(); }, [donorId]);

  const fetchShipments = async () => {
    const { data, error } = await supabase
      .from('shipments')
      .select('id, tracking_number, notes, carrier, status, created_at')
      .eq('donor_id', donorId)
      .order('created_at', { ascending: false });

    if (!error && data) setShipments(data as Shipment[]);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!trackingNumber.trim() || !user) return;
    setAdding(true);
    const { error } = await supabase.from('shipments').insert({
      donor_id: donorId,
      tracking_number: trackingNumber.trim(),
      notes: notes.trim() || null,
      carrier: carrier || null,
      created_by: user.id,
    } as any);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      setTrackingNumber('');
      setNotes('');
      setCarrier('');
      fetchShipments();
    }
    setAdding(false);
  };

  const handleStatusChange = async (shipmentId: string, newStatus: string) => {
    const { error } = await supabase
      .from('shipments')
      .update({ status: newStatus } as any)
      .eq('id', shipmentId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      fetchShipments();
    }
  };

  return (
    <Card>
      <CardHeader>
        <p className="text-sm font-medium">Shipments</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {canAdd && (
          <div className="space-y-3">
            <div className="flex items-end gap-3">
              <div className="w-36 space-y-1">
                <label className="text-[13px] text-muted-foreground">Carrier</label>
                <Select value={carrier} onValueChange={setCarrier}>
                  <SelectTrigger className="h-9 text-[13px]">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {CARRIERS.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="text-[13px]">{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[13px] text-muted-foreground">Tracking Number</label>
                <Input
                  placeholder="e.g. 1Z999AA10123456784"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="h-9 text-[13px]"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[13px] text-muted-foreground">Note (optional)</label>
                <Input
                  placeholder="e.g. Vascular tissue"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-9 text-[13px]"
                />
              </div>
              <Button size="sm" onClick={handleAdd} disabled={adding || !trackingNumber.trim()} className="h-9 text-[13px]">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-[13px] text-muted-foreground">Loading…</p>
        ) : shipments.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <Package className="h-5 w-5 mb-2 opacity-40" />
            <p className="text-[13px]">No shipments recorded yet</p>
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-border">
            {shipments.map((s) => {
              const statusInfo = getStatusInfo(s.status);
              const StatusIcon = statusInfo.icon;
              return (
                <div key={s.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-[13px] font-medium truncate">{s.tracking_number}</p>
                        {s.carrier && (
                          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{getCarrierLabel(s.carrier)}</span>
                        )}
                      </div>
                      {s.notes && <p className="text-[12px] text-muted-foreground mt-0.5">{s.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {isAdmin ? (
                      <Select value={s.status} onValueChange={(v) => handleStatusChange(s.id, v)}>
                        <SelectTrigger className="h-7 w-[160px] text-[12px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((st) => (
                            <SelectItem key={st.value} value={st.value} className="text-[12px]">{st.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className={`text-[11px] ${statusInfo.color}`}>
                        {statusInfo.label}
                      </Badge>
                    )}
                    <span className="text-[12px] text-muted-foreground whitespace-nowrap">
                      {new Date(s.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ShipmentTracking;
