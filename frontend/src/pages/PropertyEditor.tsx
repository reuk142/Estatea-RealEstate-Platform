import { ArrowLeft, ImagePlus, Save, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { request, errorMessage } from "../services/api";
import { ErrorState, LoadingState } from "../components/States";
import type { Property, PropertyImage } from "../types";

type FormValues = { title: string; description: string; price: string; propertyType: string; listingType: string; city: string; address: string; area: string; bedrooms: string; bathrooms: string };
const emptyValues: FormValues = { title: "", description: "", price: "", propertyType: "apartment", listingType: "sale", city: "", address: "", area: "", bedrooms: "2", bathrooms: "1" };

export default function PropertyEditor() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [existingImages, setExistingImages] = useState<PropertyImage[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fileError, setFileError] = useState("");
  useEffect(() => {
    if (!id) return;
    request<{ property: Property }>({ url: `/properties/${id}` }).then(({ property }) => {
      setValues({ title: property.title, description: property.description, price: String(property.price), propertyType: property.propertyType, listingType: property.listingType, city: property.city, address: property.address, area: String(property.area), bedrooms: String(property.bedrooms), bathrooms: String(property.bathrooms) });
      setExistingImages(property.images);
    }).catch((reason: unknown) => setError(errorMessage(reason))).finally(() => setLoading(false));
  }, [id]);

  function chooseFiles(selected: FileList | null) {
    if (!selected) return;
    const newFiles = Array.from(selected);
    if (newFiles.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      setFileError("Choose JPEG, PNG, or WebP images.");
      return;
    }
    if (newFiles.some((file) => file.size > 5 * 1024 * 1024)) {
      setFileError("Each image must be smaller than 5 MB.");
      return;
    }
    if (newFiles.length + existingImages.length > 4) {
      setFileError("You can add up to four images in total.");
      return;
    }
    setFileError("");
    setFiles(newFiles);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData();
    Object.entries(values).forEach(([key, value]) => form.append(key, value));
    files.forEach((file) => form.append("images", file));
    if (editing) form.append("keepImageIds", JSON.stringify(existingImages.map((image) => image.fileId)));
    try {
      const result = await request<{ property: Property }>({ url: editing ? `/properties/${id}` : "/properties", method: editing ? "PATCH" : "POST", data: form, headers: { "Content-Type": "multipart/form-data" } });
      navigate(`/properties/${result.property._id}`);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }
  async function removeProperty() {
    if (!id || !window.confirm("Delete this listing? This cannot be undone.")) return;
    setBusy(true);
    setError("");
    try {
      await request({ url: `/properties/${id}`, method: "DELETE" });
      navigate("/my-properties");
    } catch (reason) {
      setError(errorMessage(reason));
      setBusy(false);
    }
  }
  if (loading) return <LoadingState />;
  if (error && editing && values.title === "") return <div className="section py-20"><ErrorState message={error} /><Link to="/my-properties" className="text-link mt-5"><ArrowLeft size={15} /> My listings</Link></div>;
  const field = (key: keyof FormValues) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setValues({ ...values, [key]: event.target.value });

  return <div className="editor-page"><Link to={editing ? "/my-properties" : "/dashboard"} className="text-link"><ArrowLeft size={15} /> Back to your space</Link><div className="editor-heading"><p className="eyebrow eyebrow-dark">Your place, your way</p><h1>{editing ? "Give your listing a little love." : "Let's find it a good home."}</h1><p>Tell us what makes this space feel special.</p></div>
    <form className="property-form" onSubmit={submit}>
      <section className="form-section"><h2>Start with the basics</h2><div className="editor-grid"><label className="field-label editor-wide">Listing title<input required minLength={5} maxLength={120} value={values.title} onChange={field("title")} placeholder="A sunlit apartment with room to grow" /></label><label className="field-label">Listing type<select value={values.listingType} onChange={field("listingType")}><option value="sale">For sale</option><option value="rent">For rent</option></select></label><label className="field-label">Property type<select value={values.propertyType} onChange={field("propertyType")}><option value="apartment">Apartment</option><option value="house">House</option><option value="villa">Villa</option><option value="plot">Plot</option><option value="commercial">Commercial</option></select></label><label className="field-label editor-wide">Description<textarea required minLength={30} maxLength={5000} rows={6} value={values.description} onChange={field("description")} placeholder="What makes this place feel like home?" /></label></div></section>
      <section className="form-section"><h2>Where it lives</h2><div className="editor-grid"><label className="field-label editor-wide">Street address<input required minLength={5} maxLength={250} value={values.address} onChange={field("address")} placeholder="Building, street, neighbourhood" /></label><label className="field-label">City<input required minLength={2} maxLength={80} value={values.city} onChange={field("city")} placeholder="Pune" /></label><label className="field-label">Area (sq ft)<input required type="number" min="1" value={values.area} onChange={field("area")} /></label></div></section>
      <section className="form-section"><h2>Set the details</h2><div className="editor-grid"><label className="field-label">Price in INR<input required type="number" min="1" value={values.price} onChange={field("price")} placeholder="e.g. 8500000" /></label><label className="field-label">Bedrooms<input required type="number" min="0" max="30" value={values.bedrooms} onChange={field("bedrooms")} /></label><label className="field-label">Bathrooms<input required type="number" min="0" max="30" value={values.bathrooms} onChange={field("bathrooms")} /></label></div></section>
      <section className="form-section"><h2>Show them around</h2><p className="form-section-copy">Add up to four bright, clear photos. JPEG, PNG, or WebP; up to 5 MB each.</p><div className="image-upload-grid">{existingImages.map((image) => <div className="upload-preview" key={image.fileId}><img src={image.url} alt="Current property" /><button type="button" aria-label="Remove image" onClick={() => setExistingImages(existingImages.filter((item) => item.fileId !== image.fileId))}><Trash2 size={15} /></button></div>)}{files.map((file, index) => <div className="upload-preview" key={`${file.name}-${index}`}><img src={URL.createObjectURL(file)} alt={file.name} /><button type="button" aria-label="Remove selected image" onClick={() => setFiles(files.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></button></div>)}{files.length + existingImages.length < 4 && <label className="upload-picker"><ImagePlus size={24} /><span>Add photos</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => chooseFiles(event.target.files)} /></label>}</div>{fileError && <p className="form-error">{fileError}</p>}</section>
      {error && <p className="form-error">{error}</p>}<div className="editor-actions"><button type="submit" className="button button-dark" disabled={busy}><Save size={16} />{busy ? "Saving…" : editing ? "Save changes" : "Publish listing"}</button>{editing && <button type="button" className="button button-danger" disabled={busy} onClick={() => void removeProperty()}><Trash2 size={16} />Delete listing</button>}</div>
    </form>
  </div>;
} 
