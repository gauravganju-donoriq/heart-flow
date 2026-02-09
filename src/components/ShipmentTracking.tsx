import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Package, Plus, Truck } from 'lucide-react';

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

  useEffect(() => {
    fetchShipments();
  }, [donorId]);

  const fetchShipments = async () => {
    const { data, error } = await supabase
      .from('shipments')
      .select('id, tracking_number, notes, created_at')
      .eq('donor_id', donorId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setShipments(data);
    }
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
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Shipments
        </CardTitle>
        <CardDescription>Courier tracking numbers linked to this donor</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add form */}
        {canAdd && (
          <div className="flex items-end gap-3 p-3 rounded-md border border-dashed">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tracking Number</label>
              <Input
                placeholder="e.g. 1Z999AA10123456784"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Note (optional)</label>
              <Input
                placeholder="e.g. Vascular tissue"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <Button size="sm" onClick={handleAdd} disabled={adding || !trackingNumber.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        )}

        {/* List */}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : shipments.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-muted-foreground">
            <Package className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No shipments recorded yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {shipments.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-mono text-sm font-medium">{s.tracking_number}</p>
                  {s.notes && <p className="text-xs text-muted-foreground">{s.notes}</p>}
                </div>
                <span className="text-xs text-muted-foreground">
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
