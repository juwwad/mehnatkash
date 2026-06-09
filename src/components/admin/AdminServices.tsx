import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Edit2, Trash2, Check, X, Zap, Droplets, Hammer, Paintbrush, Fan, Cog } from "@/components/icons/FontAwesomeIcons";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Service {
  id: string;
  name: string;
  type: string;
  description: string | null;
  icon: string | null;
  base_rate: number;
  is_active: boolean;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  zap: Zap,
  droplets: Droplets,
  hammer: Hammer,
  paintbrush: Paintbrush,
  fan: Fan,
  cog: Cog,
};

export const AdminServices = ({ isAdmin }: { isAdmin: boolean }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", base_rate: 0, is_active: true });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newService, setNewService] = useState({ name: "", type: "", description: "", base_rate: 500 });

  const fetchServices = async () => {
    if (!isAdmin) return;
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("name");

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error("Error fetching services:", error);
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [isAdmin]);

  if (!isAdmin) return null;

  const handleEdit = (service: Service) => {
    setEditingId(service.id);
    setEditForm({ name: service.name, base_rate: service.base_rate, is_active: service.is_active });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const { error } = await supabase
        .from("services")
        .update(editForm)
        .eq("id", id);

      if (error) throw error;

      toast.success("Service updated!");
      setEditingId(null);
      fetchServices();
    } catch (error) {
      console.error("Error updating:", error);
      toast.error("Failed to update");
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from("services")
        .update({ is_active: !currentActive })
        .eq("id", id);

      if (error) throw error;

      toast.success(currentActive ? "Service deactivated" : "Service activated");
      fetchServices();
    } catch (error) {
      console.error("Error toggling:", error);
      toast.error("Failed to update");
    }
  };

  const handleAddService = async () => {
    if (!newService.name || !newService.type) {
      toast.error("Name and type are required");
      return;
    }

    try {
      const { error } = await supabase.from("services").insert({
        name: newService.name,
        type: newService.type.toLowerCase().replace(/\s+/g, "_"),
        description: newService.description || null,
        base_rate: newService.base_rate,
        is_active: true,
      });

      if (error) throw error;

      toast.success("Service added!");
      setShowAddForm(false);
      setNewService({ name: "", type: "", description: "", base_rate: 500 });
      fetchServices();
    } catch (error) {
      console.error("Error adding:", error);
      toast.error("Failed to add service");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-card rounded-2xl p-6 animate-pulse">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 rounded-xl bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-32 bg-muted rounded" />
                <div className="h-4 w-48 bg-muted rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowAddForm(true)}
        className="w-full p-4 border-2 border-dashed border-primary/30 rounded-2xl text-primary font-semibold flex items-center justify-center gap-2 hover:bg-primary/5 transition-colors haptic"
      >
        <Plus className="w-5 h-5" />
        Add New Service
      </motion.button>

      {/* Add Form */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-card rounded-2xl p-5 shadow-card space-y-4"
        >
          <h3 className="font-bold text-foreground">New Service</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Service Name"
              value={newService.name}
              onChange={(e) => setNewService({ ...newService, name: e.target.value })}
              className="col-span-2 p-3 bg-muted rounded-xl border-2 border-transparent focus:border-primary focus:outline-none"
            />
            <input
              type="text"
              placeholder="Type (e.g., electrician)"
              value={newService.type}
              onChange={(e) => setNewService({ ...newService, type: e.target.value })}
              className="p-3 bg-muted rounded-xl border-2 border-transparent focus:border-primary focus:outline-none"
            />
            <input
              type="number"
              placeholder="Base Rate"
              value={newService.base_rate}
              onChange={(e) => setNewService({ ...newService, base_rate: Number(e.target.value) })}
              className="p-3 bg-muted rounded-xl border-2 border-transparent focus:border-primary focus:outline-none"
            />
            <textarea
              placeholder="Description (optional)"
              value={newService.description}
              onChange={(e) => setNewService({ ...newService, description: e.target.value })}
              className="col-span-2 p-3 bg-muted rounded-xl border-2 border-transparent focus:border-primary focus:outline-none resize-none h-20"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl bg-muted text-muted-foreground font-medium haptic"
            >
              Cancel
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleAddService}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium haptic"
            >
              Add Service
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Services List */}
      <div className="space-y-4">
        {services.map((service, index) => {
          const IconComponent = iconMap[service.icon || "cog"] || Cog;
          const isEditing = editingId === service.id;

          return (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-card rounded-2xl p-5 shadow-card ${!service.is_active ? "opacity-60" : ""}`}
            >
              <div className="flex gap-4 items-start">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  service.is_active ? "bg-primary/10" : "bg-muted"
                }`}>
                  <IconComponent className={`w-6 h-6 ${service.is_active ? "text-primary" : "text-muted-foreground"}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full p-2 bg-muted rounded-lg text-foreground font-bold"
                      />
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Rate:</span>
                          <input
                            type="number"
                            value={editForm.base_rate}
                            onChange={(e) => setEditForm({ ...editForm, base_rate: Number(e.target.value) })}
                            className="w-24 p-2 bg-muted rounded-lg text-foreground"
                          />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.is_active}
                            onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">Active</span>
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-sm font-medium haptic"
                        >
                          Cancel
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleSaveEdit(service.id)}
                          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium haptic"
                        >
                          Save
                        </motion.button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-foreground">{service.name}</h3>
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                          service.is_active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                        }`}>
                          {service.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{service.description || "No description"}</p>
                      <div className="flex items-center justify-between">
                        <div className="price-tag text-sm">Rs {service.base_rate}/hr base</div>
                        <div className="flex gap-2">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleToggleActive(service.id, service.is_active)}
                            className={`p-2 rounded-lg haptic ${
                              service.is_active
                                ? "bg-destructive/10 text-destructive"
                                : "bg-success/10 text-success"
                            }`}
                          >
                            {service.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleEdit(service)}
                            className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground haptic"
                          >
                            <Edit2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
