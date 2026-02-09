import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Package, Plus } from 'lucide-react';

interface Shipment {
  id: string;
  tracking_number: string;
  notes: string | null;
  created_at: string;
}

interface ShipmentTrackingProps {
  donorId: string;
  canAdd: boolean;
}

const ShipmentTracking = ({ donorId, canAdd }: ShipmentTrackingProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => { fetchShipments(); }, [donorId]);

  const fetchShipments = async () => {
    const { data, error } = await supabase
      .from('shipments')
      .select('id, tracking_number, notes, created_at')
      .eq('donor_id', donorId)
      .order('created_at', { ascending: false });

    if (!error && data) setShipments(data);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!trackingNumber.trim() || !user) return;
    setAdding(true);
    const { error } = await supabase.from('shipments').insert({
      donor_id: donorId,
      tracking_number: trackingNumber.trim(),
      notes: notes.trim() || null,
      created_by: user.id,
    });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      setTrackingNumber('');
      setNotes('');
      fetchShipments();
    }
    setAdding(false);
  };

  return (
    <Card>
      <CardHeader>
        <p className="text-sm font-medium">Shipments</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {canAdd && (
          <div className="flex items-end gap-3">
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
            {shipments.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="font-mono text-[13px] font-medium">{s.tracking_number}</p>
                  {s.notes && <p className="text-[12px] text-muted-foreground mt-0.5">{s.notes}</p>}
                </div>
                <span className="text-[12px] text-muted-foreground">
                  {new Date(s.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ShipmentTracking;
