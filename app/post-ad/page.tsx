"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Plus, Camera, Video as VideoIcon, X, Info, DollarSign, Package, Tag, Truck, MessageSquare, Car, Home, Smartphone, Sofa, Shirt, Dumbbell, Dog, Baby, Gift, Snowflake, Leaf, Phone } from "lucide-react";
import { useAuth } from "@/lib/firebase/AuthContext";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, db } from "@/lib/firebase/config";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Canadian Market Categories with specific fields
const AD_CATEGORIES = [
  { 
    id: "vehicles", 
    name: "Vehicles", 
    icon: "🚗", 
    subcategories: ["Cars & Trucks", "SUVs & Crossovers", "Motorcycles & ATVs", "RVs & Campers", "Boats & Watercraft", "Snowmobiles", "Heavy Equipment", "Parts & Accessories", "Tires & Rims"],
    fields: ["make", "model", "year", "mileage", "transmission", "fuelType", "drivetrain", "bodyType", "exteriorColor", "interiorColor", "vin", "numberOfDoors", "numberOfSeats", "features"]
  },
  { 
    id: "property", 
    name: "Real Estate", 
    icon: "🏠", 
    subcategories: ["Houses for Sale", "Houses for Rent", "Condos & Apartments", "Land & Lots", "Commercial", "Rooms & Roommates", "Short-term Rentals", "Parking & Storage"],
    fields: ["propertyType", "bedrooms", "bathrooms", "squareFeet", "lotSize", "yearBuilt", "parking", "laundry", "petFriendly", "furnished", "utilities", "moveInDate"]
  },
  { 
    id: "electronics", 
    name: "Electronics", 
    icon: "📱", 
    subcategories: ["Cell Phones", "Computers & Laptops", "Tablets & iPads", "TVs & Monitors", "Cameras & Drones", "Gaming Consoles", "Audio Equipment", "Wearables & Smartwatches", "Computer Parts", "Networking"],
    fields: ["brand", "model", "storageCapacity", "screenSize", "processor", "ram", "warranty", "accessories"]
  },
  { 
    id: "appliances", 
    name: "Appliances", 
    icon: "🧊", 
    subcategories: ["Refrigerators & Freezers", "Washers & Dryers", "Stoves & Ovens", "Dishwashers", "Microwaves", "Air Conditioners", "Heaters & Furnaces", "Vacuums", "Small Kitchen Appliances", "Other Appliances"],
    fields: ["brand", "model", "capacity", "energyRating", "color", "dimensions", "warranty", "age"]
  },
  { 
    id: "furniture", 
    name: "Furniture", 
    icon: "🛋️", 
    subcategories: ["Living Room", "Bedroom", "Dining Room", "Office Furniture", "Outdoor & Patio", "Mattresses", "Storage & Organization", "Kids Furniture"],
    fields: ["material", "color", "dimensions", "style", "brand", "assembly"]
  },
  { 
    id: "fashion", 
    name: "Clothing & Accessories", 
    icon: "👗", 
    subcategories: ["Men's Clothing", "Women's Clothing", "Kids & Baby Clothing", "Shoes & Footwear", "Bags & Luggage", "Jewelry & Watches", "Winter Wear", "Sports Apparel"],
    fields: ["size", "brand", "color", "material", "gender", "style"]
  },
  { 
    id: "sports", 
    name: "Sports & Recreation", 
    icon: "⚽", 
    subcategories: ["Hockey Equipment", "Skiing & Snowboarding", "Camping & Hiking", "Fishing & Hunting", "Cycling", "Golf", "Water Sports", "Fitness Equipment", "Team Sports"],
    fields: ["brand", "size", "sport", "level", "condition"]
  },
  { 
    id: "pets", 
    name: "Pets", 
    icon: "🐕", 
    subcategories: ["Dogs", "Cats", "Birds", "Fish & Aquariums", "Small Animals", "Reptiles", "Pet Supplies", "Pet Services", "Lost & Found Pets"],
    fields: ["breed", "age", "gender", "vaccinated", "neutered", "microchipped", "goodWith"]
  },
  { 
    id: "baby", 
    name: "Baby & Kids", 
    icon: "👶", 
    subcategories: ["Strollers & Car Seats", "Cribs & Nursery", "Baby Clothing", "Toys & Games", "Feeding & Nursing", "Diapers & Bathing", "Kids Furniture", "Books & Learning"],
    fields: ["ageRange", "brand", "safetyStandards", "gender"]
  },
  { 
    id: "home", 
    name: "Home & Garden", 
    icon: "🏡", 
    subcategories: ["Tools & Hardware", "Building Materials", "Lawn & Garden", "Home Decor", "Kitchen & Dining", "Bedding & Bath", "Lighting", "Heating & Cooling"],
    fields: ["brand", "material", "dimensions", "powerSource"]
  },
  { 
    id: "seasonal", 
    name: "Seasonal & Holiday", 
    icon: "🎄", 
    subcategories: ["Winter Sports Gear", "Christmas & Holiday", "Halloween", "Summer Equipment", "Firewood & Heating", "Pool & Spa"],
    fields: ["season", "eventType"]
  },
  { 
    id: "free", 
    name: "Free Stuff", 
    icon: "🎁", 
    subcategories: ["Free Items", "Curb Alerts", "Swap & Trade"],
    fields: []
  },
  { 
    id: "other", 
    name: "Other", 
    icon: "📦", 
    subcategories: ["Collectibles & Art", "Musical Instruments", "Books & Magazines", "Tickets", "Health & Beauty", "Hobbies & Crafts", "Business Equipment", "Farm Equipment"],
    fields: ["type", "brand"]
  },
];

// Vehicle specific options
const VEHICLE_MAKES = ["Acura", "Audi", "BMW", "Buick", "Cadillac", "Chevrolet", "Chrysler", "Dodge", "Ford", "GMC", "Honda", "Hyundai", "Infiniti", "Jeep", "Kia", "Lexus", "Lincoln", "Mazda", "Mercedes-Benz", "Mitsubishi", "Nissan", "Porsche", "Ram", "Subaru", "Tesla", "Toyota", "Volkswagen", "Volvo", "Other"];
const TRANSMISSIONS = ["Automatic", "Manual", "CVT", "Semi-Automatic"];
const FUEL_TYPES = ["Gasoline", "Diesel", "Hybrid", "Electric", "Plug-in Hybrid", "Flex Fuel"];
const DRIVETRAINS = ["Front-Wheel Drive (FWD)", "Rear-Wheel Drive (RWD)", "All-Wheel Drive (AWD)", "4x4"];
const BODY_TYPES = ["Sedan", "SUV", "Truck", "Coupe", "Hatchback", "Convertible", "Van/Minivan", "Wagon"];

// Property specific options
const PROPERTY_TYPES = ["Detached House", "Semi-Detached", "Townhouse", "Condo", "Apartment", "Duplex", "Triplex", "Land/Lot", "Commercial"];
const PARKING_OPTIONS = ["Garage", "Driveway", "Street Parking", "Underground", "No Parking"];
const LAUNDRY_OPTIONS = ["In-unit", "In-building", "None"];

// Electronics brands
const ELECTRONICS_BRANDS = ["Apple", "Samsung", "Google", "LG", "Sony", "Microsoft", "Dell", "HP", "Lenovo", "ASUS", "Acer", "Canon", "Nikon", "DJI", "GoPro", "Other"];

// Appliance brands
const APPLIANCE_BRANDS = ["Samsung", "LG", "Whirlpool", "GE", "Frigidaire", "Bosch", "KitchenAid", "Maytag", "Kenmore", "Miele", "Dyson", "Shark", "iRobot", "Other"];

const CONDITION_OPTIONS = [
  { value: "new", label: "Brand New", description: "Never used, sealed in box" },
  { value: "like_new", label: "Like New", description: "Open box or barely used" },
  { value: "excellent", label: "Excellent", description: "Minimal signs of use" },
  { value: "good", label: "Good", description: "Normal wear, fully functional" },
  { value: "fair", label: "Fair", description: "Shows wear, works well" },
  { value: "salvage", label: "For Parts/Salvage", description: "Not fully functional" },
];

// Generate years from current year to 1980
const YEARS = Array.from({ length: new Date().getFullYear() - 1979 }, (_, i) => (new Date().getFullYear() - i).toString());

// TaskZing WhatsApp number for "Sell It For Me" service
const TASKZING_WHATSAPP = "+16472948542";

export default function PostAdPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [activeTab, setActiveTab] = useState<"post" | "drafts">("post");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSellItForMeModalOpen, setIsSellItForMeModalOpen] = useState(false);
  const [isFeatureAdModalOpen, setIsFeatureAdModalOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showErrorBanner, setShowErrorBanner] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    location: "",
    condition: "",
    tags: [] as string[],
    tagInput: "",
    isNegotiable: false,
    acceptsTrades: false,
    contactPreference: "both" as "chat" | "call" | "both",
    phoneCode: "+1" as "+1",
    phoneNumber: "",
    sellItForMe: false,
    featureAd: false,
  });

  // Category-specific fields
  const [categoryFields, setCategoryFields] = useState<Record<string, string>>({});

  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [currency, setCurrency] = useState<"CAD" | "USD">("CAD");
  
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Detect user's country and set currency
  useEffect(() => {
    const detectCountry = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/");
        const data = await response.json();
        if (data.country_code === "US") {
          setCurrency("USD");
        } else {
          setCurrency("CAD"); // Default to CAD for Canada and other countries
        }
      } catch {
        setCurrency("CAD"); // Default to CAD if detection fails
      }
    };
    detectCountry();
  }, []);

  useEffect(() => {
    if (userData && (userData as any).location) {
      setFormData((prev) => ({ ...prev, location: (userData as any).location }));
    }
  }, [userData]);

  // Reset category fields when category changes
  useEffect(() => {
    setCategoryFields({});
  }, [selectedCategory]);

  const updateCategoryField = (field: string, value: string) => {
    setCategoryFields((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 5) {
      alert("Maximum 5 photos allowed");
      return;
    }
    const newPhotos = [...photos, ...files];
    setPhotos(newPhotos);
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPhotoPreviews([...photoPreviews, ...newPreviews]);
    if (newPhotos.length >= 1) clearError("photos");
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotos(photos.filter((_, i) => i !== index));
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== index));
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Video size must be less than 5MB");
      return;
    }
    setVideo(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const removeVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideo(null);
    setVideoPreview(null);
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const addTag = () => {
    if (formData.tagInput.trim() && !formData.tags.includes(formData.tagInput.trim()) && formData.tags.length < 10) {
      setFormData({ ...formData, tags: [...formData.tags, formData.tagInput.trim()], tagInput: "" });
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  // Calculate "Sell It For Me" service fee based on product price
  const calculateSellItForMeFee = (): number => {
    const priceString = formData.price || "";
    const price = parseFloat(priceString.replace(/[^0-9.]/g, "")) || 0;
    if (price <= 0) return 20; // Base fee $20
    if (price <= 100) return 15; // Lower price, lower fee
    if (price <= 500) return 20; // Standard fee
    if (price <= 1000) return 25;
    if (price <= 5000) return 35;
    if (price <= 10000) return 50;
    return 75; // High-value items
  };

  const handleSellItForMeToggle = () => {
    if (!formData.sellItForMe) {
      // Opening - show modal
      setIsSellItForMeModalOpen(true);
    } else {
      // Closing - just turn off
      setFormData({ ...formData, sellItForMe: false });
    }
  };

  const acceptSellItForMe = () => {
    setFormData({ ...formData, sellItForMe: true });
    setIsSellItForMeModalOpen(false);
  };

  const declineSellItForMe = () => {
    setIsSellItForMeModalOpen(false);
  };

  // Feature Ad handlers
  const handleFeatureAdToggle = () => {
    if (!formData.featureAd) {
      setIsFeatureAdModalOpen(true);
    } else {
      setFormData({ ...formData, featureAd: false });
    }
  };

  const acceptFeatureAd = () => {
    setFormData({ ...formData, featureAd: true });
    setIsFeatureAdModalOpen(false);
  };

  const declineFeatureAd = () => {
    setIsFeatureAdModalOpen(false);
  };

  const clearError = (fieldName: string) => {
    if (errors[fieldName]) {
      setErrors((prev) => { const n = { ...prev }; delete n[fieldName]; return n; });
    }
  };

  const fetchUserLocation = () => {
    if (!navigator.geolocation) { alert("Geolocation is not supported."); return; }
    setIsFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
          if (!response.ok) throw new Error("Failed to fetch address");
          const data = await response.json();
          if (data.display_name) {
            setFormData((prev) => ({ ...prev, location: data.display_name }));
            clearError("location");
          }
        } catch (error) {
          alert("Failed to fetch your location.");
        } finally {
          setIsFetchingLocation(false);
        }
      },
      () => { setIsFetchingLocation(false); alert("Failed to get your location."); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!selectedCategory) newErrors.category = "Please select a category";
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    if (!formData.price.trim() && selectedCategory !== "free") newErrors.price = "Price is required";
    if (!formData.location.trim()) newErrors.location = "Location is required";
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = "Phone number is required";
    else if (formData.phoneNumber.length !== 10) newErrors.phoneNumber = "Phone number must be 10 digits";
    if (!formData.condition && selectedCategory !== "free") newErrors.condition = "Condition is required";
    if (photos.length < 1) newErrors.photos = "At least 1 photo is required";
    setErrors(newErrors);
    setShowErrorBanner(Object.keys(newErrors).length > 0);
    return Object.keys(newErrors).length === 0;
  };

  const handlePreviewClick = () => {
    if (validateForm()) {
      setIsPreviewOpen(true);
      setShowErrorBanner(false);
    }
  };

  const uploadPhotos = async (files: File[], userId: string): Promise<string[]> => {
    return Promise.all(files.map(async (file) => {
      const storageRef = ref(storage, `ads/${userId}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      return await getDownloadURL(storageRef);
    }));
  };

  const uploadVideo = async (file: File, userId: string): Promise<string> => {
    const storageRef = ref(storage, `ads/${userId}/videos/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async () => {
    if (!user) { alert("Please sign in to post an ad."); return; }
    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      const photoUrls = await uploadPhotos(photos, user.uid);
      let videoUrl: string | undefined;
      if (video) videoUrl = await uploadVideo(video, user.uid);

      // Determine contact info based on Sell It For Me option
      const displayContactPhone = formData.sellItForMe ? TASKZING_WHATSAPP : `${formData.phoneCode}${formData.phoneNumber}`;
      const contactMethod = formData.sellItForMe ? "whatsapp_only" : formData.contactPreference;

      const adData = {
        userId: user.uid,
        posterName: userData?.fullName || user.displayName || user.email?.split("@")[0] || "User",
        posterEmail: user.email,
        posterPhone: `${formData.phoneCode}${formData.phoneNumber}`, // Original poster phone (for admin)
        displayContactPhone: displayContactPhone, // Phone shown to buyers
        displayContactName: formData.sellItForMe ? "TaskZing Team" : (userData?.fullName || user.displayName || "Seller"),
        contactMethod: contactMethod, // "whatsapp_only", "chat", "call", or "both"
        category: selectedCategory,
        subcategory: selectedSubcategory,
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: selectedCategory === "free" ? 0 : parseFloat(formData.price.replace(/[^0-9.]/g, "")),
        currency: currency,
        location: formData.location.trim(),
        condition: formData.condition,
        tags: formData.tags,
        photos: photoUrls,
        videoUrl: videoUrl || null,
        isNegotiable: formData.isNegotiable,
        acceptsTrades: formData.acceptsTrades,
        contactPreference: formData.contactPreference,
        sellItForMe: formData.sellItForMe,
        sellItForMeFee: formData.sellItForMe ? calculateSellItForMeFee() : 0,
        featureAd: formData.featureAd,
        featureAdFee: formData.featureAd ? 10 : 0,
        categoryFields: categoryFields,
        status: "active",
        views: 0,
        saves: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await addDoc(collection(db, "ads"), adData);
      alert("Ad posted successfully!");
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Error posting ad:", error);
      alert(error.message || "Failed to post ad. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryById = (id: string) => AD_CATEGORIES.find(c => c.id === id);

  // Render category-specific fields
  const renderCategoryFields = () => {
    if (!selectedCategory) return null;

    switch (selectedCategory) {
      case "vehicles":
        return (
          <div className="space-y-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
            <h3 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Car className="h-5 w-5 text-red-500" /> Vehicle Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Make */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Make *</label>
                <select value={categoryFields.make || ""} onChange={(e) => updateCategoryField("make", e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white">
                  <option value="">Select Make</option>
                  {VEHICLE_MAKES.map(make => <option key={make} value={make}>{make}</option>)}
                </select>
              </div>
              {/* Model */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Model *</label>
                <input type="text" value={categoryFields.model || ""} onChange={(e) => updateCategoryField("model", e.target.value)} placeholder="e.g., Civic, F-150, RAV4" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
              {/* Year */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year *</label>
                <select value={categoryFields.year || ""} onChange={(e) => updateCategoryField("year", e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white">
                  <option value="">Select Year</option>
                  {YEARS.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
              {/* Mileage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mileage (km) *</label>
                <input type="text" value={categoryFields.mileage || ""} onChange={(e) => updateCategoryField("mileage", e.target.value)} placeholder="e.g., 85,000" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
              {/* Transmission */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transmission</label>
                <select value={categoryFields.transmission || ""} onChange={(e) => updateCategoryField("transmission", e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white">
                  <option value="">Select Transmission</option>
                  {TRANSMISSIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {/* Fuel Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fuel Type</label>
                <select value={categoryFields.fuelType || ""} onChange={(e) => updateCategoryField("fuelType", e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white">
                  <option value="">Select Fuel Type</option>
                  {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              {/* Drivetrain */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Drivetrain</label>
                <select value={categoryFields.drivetrain || ""} onChange={(e) => updateCategoryField("drivetrain", e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white">
                  <option value="">Select Drivetrain</option>
                  {DRIVETRAINS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              {/* Body Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body Type</label>
                <select value={categoryFields.bodyType || ""} onChange={(e) => updateCategoryField("bodyType", e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white">
                  <option value="">Select Body Type</option>
                  {BODY_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              {/* Exterior Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Exterior Color</label>
                <input type="text" value={categoryFields.exteriorColor || ""} onChange={(e) => updateCategoryField("exteriorColor", e.target.value)} placeholder="e.g., Black, White, Silver" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
              {/* Interior Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Interior Color</label>
                <input type="text" value={categoryFields.interiorColor || ""} onChange={(e) => updateCategoryField("interiorColor", e.target.value)} placeholder="e.g., Black Leather" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
              {/* VIN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">VIN (Optional)</label>
                <input type="text" value={categoryFields.vin || ""} onChange={(e) => updateCategoryField("vin", e.target.value)} placeholder="Vehicle Identification Number" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
              {/* Trim/Variant */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trim / Variant</label>
                <input type="text" value={categoryFields.trim || ""} onChange={(e) => updateCategoryField("trim", e.target.value)} placeholder="e.g., EX-L, Sport, Limited" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
            </div>
            {/* Features Checkboxes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Features</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {["Backup Camera", "Bluetooth", "Heated Seats", "Sunroof", "Navigation", "Leather Seats", "Remote Start", "Apple CarPlay", "Android Auto", "Blind Spot Monitor", "Lane Assist", "Cruise Control", "Parking Sensors", "Winter Tires Included"].map((feature) => (
                  <label key={feature} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={(categoryFields.features || "").includes(feature)} onChange={(e) => {
                      const current = categoryFields.features ? categoryFields.features.split(",").filter(f => f) : [];
                      if (e.target.checked) {
                        updateCategoryField("features", [...current, feature].join(","));
                      } else {
                        updateCategoryField("features", current.filter(f => f !== feature).join(","));
                      }
                    }} className="w-4 h-4 text-red-500 border-gray-300 rounded focus:ring-red-500" />
                    <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case "property":
        return (
          <div className="space-y-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
            <h3 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Home className="h-5 w-5 text-red-500" /> Property Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Property Type *</label>
                <select value={categoryFields.propertyType || ""} onChange={(e) => updateCategoryField("propertyType", e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white">
                  <option value="">Select Type</option>
                  {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bedrooms</label>
                <select value={categoryFields.bedrooms || ""} onChange={(e) => updateCategoryField("bedrooms", e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white">
                  <option value="">Select</option>
                  {["Studio", "1", "2", "3", "4", "5", "6+"].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bathrooms</label>
                <select value={categoryFields.bathrooms || ""} onChange={(e) => updateCategoryField("bathrooms", e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white">
                  <option value="">Select</option>
                  {["1", "1.5", "2", "2.5", "3", "3.5", "4+"].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Square Feet</label>
                <input type="text" value={categoryFields.squareFeet || ""} onChange={(e) => updateCategoryField("squareFeet", e.target.value)} placeholder="e.g., 1,500" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lot Size (acres)</label>
                <input type="text" value={categoryFields.lotSize || ""} onChange={(e) => updateCategoryField("lotSize", e.target.value)} placeholder="e.g., 0.25" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year Built</label>
                <select value={categoryFields.yearBuilt || ""} onChange={(e) => updateCategoryField("yearBuilt", e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white">
                  <option value="">Select Year</option>
                  {Array.from({ length: 125 }, (_, i) => (new Date().getFullYear() - i).toString()).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Parking</label>
                <select value={categoryFields.parking || ""} onChange={(e) => updateCategoryField("parking", e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white">
                  <option value="">Select</option>
                  {PARKING_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Laundry</label>
                <select value={categoryFields.laundry || ""} onChange={(e) => updateCategoryField("laundry", e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white">
                  <option value="">Select</option>
                  {LAUNDRY_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Move-in Date</label>
                <input type="date" value={categoryFields.moveInDate || ""} onChange={(e) => updateCategoryField("moveInDate", e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              {[{ key: "petFriendly", label: "Pet Friendly" }, { key: "furnished", label: "Furnished" }, { key: "utilitiesIncluded", label: "Utilities Included" }, { key: "airConditioning", label: "Air Conditioning" }, { key: "basement", label: "Basement" }, { key: "pool", label: "Pool" }].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={categoryFields[key] === "true"} onChange={(e) => updateCategoryField(key, e.target.checked ? "true" : "")} className="w-4 h-4 text-red-500 border-gray-300 rounded focus:ring-red-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case "electronics":
        return (
          <div className="space-y-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
            <h3 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-red-500" /> Electronics Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Brand</label>
                <select value={categoryFields.brand || ""} onChange={(e) => updateCategoryField("brand", e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white">
                  <option value="">Select Brand</option>
                  {ELECTRONICS_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Model</label>
                <input type="text" value={categoryFields.model || ""} onChange={(e) => updateCategoryField("model", e.target.value)} placeholder="e.g., iPhone 15 Pro, Galaxy S24" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Storage Capacity</label>
                <input type="text" value={categoryFields.storageCapacity || ""} onChange={(e) => updateCategoryField("storageCapacity", e.target.value)} placeholder="e.g., 256GB, 1TB" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Screen Size</label>
                <input type="text" value={categoryFields.screenSize || ""} onChange={(e) => updateCategoryField("screenSize", e.target.value)} placeholder='e.g., 6.7", 27"' className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Processor/Chip</label>
                <input type="text" value={categoryFields.processor || ""} onChange={(e) => updateCategoryField("processor", e.target.value)} placeholder="e.g., A17 Pro, Snapdragon 8" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">RAM</label>
                <input type="text" value={categoryFields.ram || ""} onChange={(e) => updateCategoryField("ram", e.target.value)} placeholder="e.g., 8GB, 16GB" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                <input type="text" value={categoryFields.color || ""} onChange={(e) => updateCategoryField("color", e.target.value)} placeholder="e.g., Space Black, Silver" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Warranty</label>
                <input type="text" value={categoryFields.warranty || ""} onChange={(e) => updateCategoryField("warranty", e.target.value)} placeholder="e.g., 1 year remaining" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Accessories Included</label>
                <input type="text" value={categoryFields.accessories || ""} onChange={(e) => updateCategoryField("accessories", e.target.value)} placeholder="e.g., Charger, Case, Box" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
            </div>
          </div>
        );

      case "appliances":
        return (
          <div className="space-y-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
            <h3 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Snowflake className="h-5 w-5 text-red-500" /> Appliance Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Brand</label>
                <select value={categoryFields.brand || ""} onChange={(e) => updateCategoryField("brand", e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white">
                  <option value="">Select Brand</option>
                  {APPLIANCE_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Model Number</label>
                <input type="text" value={categoryFields.model || ""} onChange={(e) => updateCategoryField("model", e.target.value)} placeholder="e.g., WF45R6100AW" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capacity</label>
                <input type="text" value={categoryFields.capacity || ""} onChange={(e) => updateCategoryField("capacity", e.target.value)} placeholder="e.g., 21 cu. ft., 5.0 kg" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Age (years)</label>
                <select value={categoryFields.age || ""} onChange={(e) => updateCategoryField("age", e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white">
                  <option value="">Select Age</option>
                  {["Less than 1 year", "1-2 years", "2-3 years", "3-5 years", "5-10 years", "10+ years"].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Energy Rating</label>
                <select value={categoryFields.energyRating || ""} onChange={(e) => updateCategoryField("energyRating", e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white">
                  <option value="">Select Rating</option>
                  {["Energy Star Certified", "High Efficiency", "Standard", "Not Rated"].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color/Finish</label>
                <input type="text" value={categoryFields.color || ""} onChange={(e) => updateCategoryField("color", e.target.value)} placeholder="e.g., Stainless Steel, White" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dimensions (H x W x D)</label>
                <input type="text" value={categoryFields.dimensions || ""} onChange={(e) => updateCategoryField("dimensions", e.target.value)} placeholder='e.g., 70" x 36" x 30"' className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Warranty</label>
                <input type="text" value={categoryFields.warranty || ""} onChange={(e) => updateCategoryField("warranty", e.target.value)} placeholder="e.g., Under warranty until 2025" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Power/Voltage</label>
                <input type="text" value={categoryFields.power || ""} onChange={(e) => updateCategoryField("power", e.target.value)} placeholder="e.g., 120V, 240V" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
            </div>
          </div>
        );

      case "furniture":
        return (
          <div className="space-y-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
            <h3 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Sofa className="h-5 w-5 text-red-500" /> Furniture Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Brand</label>
                <input type="text" value={categoryFields.brand || ""} onChange={(e) => updateCategoryField("brand", e.target.value)} placeholder="e.g., IKEA, Ashley, Wayfair" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Material</label>
                <input type="text" value={categoryFields.material || ""} onChange={(e) => updateCategoryField("material", e.target.value)} placeholder="e.g., Solid Wood, Leather, Fabric" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                <input type="text" value={categoryFields.color || ""} onChange={(e) => updateCategoryField("color", e.target.value)} placeholder="e.g., Grey, Walnut, White" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dimensions (L x W x H)</label>
                <input type="text" value={categoryFields.dimensions || ""} onChange={(e) => updateCategoryField("dimensions", e.target.value)} placeholder='e.g., 84" x 38" x 34"' className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Style</label>
                <select value={categoryFields.style || ""} onChange={(e) => updateCategoryField("style", e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white">
                  <option value="">Select Style</option>
                  {["Modern", "Contemporary", "Traditional", "Rustic", "Industrial", "Mid-Century", "Scandinavian", "Farmhouse", "Other"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assembly Required</label>
                <select value={categoryFields.assembly || ""} onChange={(e) => updateCategoryField("assembly", e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white">
                  <option value="">Select</option>
                  {["No Assembly Required", "Easy Assembly", "Some Assembly Required", "Professional Assembly Recommended"].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
          </div>
        );

      case "pets":
        return (
          <div className="space-y-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
            <h3 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Dog className="h-5 w-5 text-red-500" /> Pet Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Breed</label>
                <input type="text" value={categoryFields.breed || ""} onChange={(e) => updateCategoryField("breed", e.target.value)} placeholder="e.g., Golden Retriever, Siamese" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Age</label>
                <input type="text" value={categoryFields.age || ""} onChange={(e) => updateCategoryField("age", e.target.value)} placeholder="e.g., 2 years, 6 months" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
                <select value={categoryFields.gender || ""} onChange={(e) => updateCategoryField("gender", e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white">
                  <option value="">Select</option>
                  {["Male", "Female"].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Size</label>
                <select value={categoryFields.size || ""} onChange={(e) => updateCategoryField("size", e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white">
                  <option value="">Select</option>
                  {["Tiny", "Small", "Medium", "Large", "Extra Large"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color/Markings</label>
                <input type="text" value={categoryFields.color || ""} onChange={(e) => updateCategoryField("color", e.target.value)} placeholder="e.g., Black, Tabby, Spotted" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              {[{ key: "vaccinated", label: "Vaccinated" }, { key: "neutered", label: "Spayed/Neutered" }, { key: "microchipped", label: "Microchipped" }, { key: "houseTrained", label: "House Trained" }, { key: "goodWithKids", label: "Good with Kids" }, { key: "goodWithPets", label: "Good with Other Pets" }].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={categoryFields[key] === "true"} onChange={(e) => updateCategoryField(key, e.target.checked ? "true" : "")} className="w-4 h-4 text-red-500 border-gray-300 rounded focus:ring-red-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                </label>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-darkBlue-013">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Post an Ad</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Sell your items</p>
          </div>

          <div className="mb-6 flex gap-3">
            <button onClick={() => setActiveTab("post")} className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "post" ? "bg-red-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200"}`}>
              Create Ad
            </button>
            <button onClick={() => setActiveTab("drafts")} className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "drafts" ? "bg-red-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200"}`}>
              Drafts
            </button>
          </div>

          {activeTab === "post" ? (
            <div className="space-y-8">
              {/* Category Selection */}
              <div data-field="category">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Select Category</h2>
                {errors.category && <p className="mb-2 text-sm text-red-500">{errors.category}</p>}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {AD_CATEGORIES.map((category) => (
                    <button key={category.id} type="button" onClick={() => { setSelectedCategory(category.id); setSelectedSubcategory(""); clearError("category"); }}
                      className={`flex flex-col items-center p-3 rounded-xl transition-all ${selectedCategory === category.id ? "bg-red-50 dark:bg-red-900/20 border-2 border-red-500 shadow-md" : "bg-white dark:bg-gray-800 border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-600 shadow-sm hover:shadow-md"}`}>
                      <span className="text-2xl mb-1">{category.icon}</span>
                      <span className={`text-xs font-medium text-center leading-tight ${selectedCategory === category.id ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"}`}>{category.name}</span>
                    </button>
                  ))}
                </div>

                {selectedCategory && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Subcategory</label>
                    <div className="flex flex-wrap gap-2">
                      {getCategoryById(selectedCategory)?.subcategories.map((sub) => (
                        <button key={sub} type="button" onClick={() => setSelectedSubcategory(sub)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedSubcategory === sub ? "bg-red-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200"}`}>
                          {sub}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Category-Specific Fields */}
              {renderCategoryFields()}

              {/* Basic Ad Details */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Ad Details</h2>
                <div className="space-y-4">
                  <div data-field="title">
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">Title <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.title} onChange={(e) => { if (e.target.value.length <= 100) { setFormData({ ...formData, title: e.target.value }); clearError("title"); }}} placeholder="What are you selling?" className={`w-full px-4 py-3 border rounded-lg focus:ring-2 dark:bg-gray-800 dark:text-white ${errors.title ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600 focus:ring-red-500"}`} />
                    <div className="flex justify-between mt-1">
                      {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
                      <span className="text-xs text-gray-500 ml-auto">{formData.title.length}/100</span>
                    </div>
                  </div>

                  <div data-field="description">
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">Description <span className="text-red-500">*</span></label>
                    <textarea value={formData.description} onChange={(e) => { if (e.target.value.length <= 2000) { setFormData({ ...formData, description: e.target.value }); clearError("description"); }}} placeholder="Describe your item in detail..." rows={5} className={`w-full px-4 py-3 border rounded-lg focus:ring-2 dark:bg-gray-800 dark:text-white resize-none ${errors.description ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600 focus:ring-red-500"}`} />
                    <span className="text-xs text-gray-500">{formData.description.length}/2000</span>
                  </div>

                  {/* Condition - only for applicable categories */}
                  {selectedCategory && selectedCategory !== "free" && (
                    <div data-field="condition">
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Condition <span className="text-red-500">*</span></label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        {CONDITION_OPTIONS.map((option) => (
                          <button key={option.value} type="button" onClick={() => { setFormData({ ...formData, condition: option.value }); clearError("condition"); }}
                            className={`p-2 rounded-lg text-center transition-all ${formData.condition === option.value ? "bg-red-50 dark:bg-red-900/20 border-2 border-red-500" : "bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300"}`}>
                            <span className={`block text-xs font-medium ${formData.condition === option.value ? "text-red-600" : "text-gray-900 dark:text-white"}`}>{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Price & Location */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Price & Location</h2>
                <div className="space-y-4">
                  {selectedCategory !== "free" && (
                    <div data-field="price">
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">Price ({currency}) <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                        <input type="text" value={formData.price} onChange={(e) => { setFormData({ ...formData, price: e.target.value }); clearError("price"); }} placeholder="0.00" className={`w-full px-4 py-3 pl-10 border rounded-lg focus:ring-2 dark:bg-gray-800 dark:text-white ${errors.price ? "border-red-500" : "border-gray-300 dark:border-gray-600"} focus:ring-red-500`} />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.isNegotiable} onChange={(e) => setFormData({ ...formData, isNegotiable: e.target.checked })} className="w-4 h-4 text-red-500 rounded" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Price Negotiable</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.acceptsTrades} onChange={(e) => setFormData({ ...formData, acceptsTrades: e.target.checked })} className="w-4 h-4 text-red-500 rounded" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Accept Trades</span>
                    </label>
                  </div>

                  <div data-field="location">
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">Location <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input type="text" value={formData.location} onChange={(e) => { setFormData({ ...formData, location: e.target.value }); clearError("location"); }} placeholder="City, Province" className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 dark:bg-gray-800 dark:text-white ${errors.location ? "border-red-500" : "border-gray-300 dark:border-gray-600"} focus:ring-red-500`} />
                      <button type="button" onClick={fetchUserLocation} disabled={isFetchingLocation} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                        {isFetchingLocation ? <div className="h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> : <MapPin className="h-5 w-5 text-gray-500 hover:text-red-500" />}
                      </button>
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div data-field="phoneNumber">
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative">
                        <select
                          value={formData.phoneCode}
                          onChange={(e) => setFormData({ ...formData, phoneCode: e.target.value as "+1" })}
                          className="appearance-none w-24 px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white text-sm"
                        >
                          <option value="+1">🇨🇦 +1</option>
                          <option value="+1">🇺🇸 +1</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="tel"
                          value={formData.phoneNumber}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                            setFormData({ ...formData, phoneNumber: value });
                            clearError("phoneNumber");
                          }}
                          placeholder="(XXX) XXX-XXXX"
                          className={`w-full px-4 py-3 pl-10 border rounded-lg focus:ring-2 dark:bg-gray-800 dark:text-white ${errors.phoneNumber ? "border-red-500" : "border-gray-300 dark:border-gray-600"} focus:ring-red-500`}
                        />
                      </div>
                    </div>
                    {errors.phoneNumber && <p className="mt-1 text-sm text-red-500">{errors.phoneNumber}</p>}
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Only USA and Canada numbers accepted (+1)</p>
                  </div>
                </div>
              </div>

              {/* Premium Options */}
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-gray-900 dark:text-white">Premium Options</h3>
                
                {/* Sell It For Me Toggle */}
                <div 
                  onClick={handleSellItForMeToggle}
                  className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.sellItForMe 
                      ? "border-red-500 bg-red-50 dark:bg-red-900/20" 
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${formData.sellItForMe ? "bg-red-500" : "bg-gray-100 dark:bg-gray-800"}`}>
                      <span className="text-2xl">🤝</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900 dark:text-white">Sell It For Me</h4>
                        <div className={`relative w-12 h-6 rounded-full transition-colors ${formData.sellItForMe ? "bg-red-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.sellItForMe ? "translate-x-7" : "translate-x-1"}`} />
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Buyers contact TaskZing via WhatsApp. We handle all inquiries and schedule meetings with you.
                      </p>
                      {formData.sellItForMe && (
                        <div className="mt-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg inline-block">
                          <span className="text-xs font-medium text-red-700 dark:text-red-300">Service fee: ${calculateSellItForMeFee()} {currency}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Feature Ad Toggle */}
                <div 
                  onClick={handleFeatureAdToggle}
                  className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.featureAd 
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20" 
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${formData.featureAd ? "bg-amber-500" : "bg-gray-100 dark:bg-gray-800"}`}>
                      <span className="text-2xl">⭐</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white">Feature Ad</h4>
                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs font-medium rounded">5x BOOST</span>
                        </div>
                        <div className={`relative w-12 h-6 rounded-full transition-colors ${formData.featureAd ? "bg-amber-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.featureAd ? "translate-x-7" : "translate-x-1"}`} />
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Get 5x more visibility! Your ad will appear at the top of search results.
                      </p>
                      {formData.featureAd && (
                        <div className="mt-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg inline-block">
                          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">$10 {currency} • Featured for 7 days</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">Tags (helps buyers find your ad)</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input type="text" value={formData.tagInput} onChange={(e) => setFormData({ ...formData, tagInput: e.target.value })} onKeyPress={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); }}} placeholder="Add tags..." className="w-full px-4 py-3 pl-10 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white" />
                  <button type="button" onClick={addTag} className="absolute right-3 top-1/2 -translate-y-1/2"><Plus className="h-5 w-5 text-gray-500" /></button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map((tag, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                        #{tag}<button type="button" onClick={() => removeTag(tag)}><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Photos */}
              <div data-field="photos">
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-900 dark:text-white">Photos <span className="text-red-500">*</span></label>
                  <span className="text-sm text-gray-500">{photos.length}/5</span>
                </div>
                {errors.photos && <p className="mb-2 text-sm text-red-500">{errors.photos}</p>}
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  {photoPreviews.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
                      {photoPreviews.map((preview, index) => (
                        <div key={index} className="relative aspect-square">
                          <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                          {index === 0 && <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded">Cover</span>}
                          <button type="button" onClick={() => removePhoto(index)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"><X className="h-3 w-3" /></button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center"><Camera className="h-10 w-10 text-gray-400 mb-2" /><span className="text-gray-600 dark:text-gray-400 text-sm">Add Photos</span></div>
                  )}
                  <button type="button" onClick={() => photoInputRef.current?.click()} className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm">
                    {photoPreviews.length > 0 ? "Add More" : "Select Photos"}
                  </button>
                  <input ref={photoInputRef} type="file" accept="image/*" multiple onChange={handlePhotoSelect} className="hidden" />
                </div>
              </div>

              {/* Video */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Video (Optional)</label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  {videoPreview ? (
                    <div className="relative max-w-sm mx-auto">
                      <video src={videoPreview} controls className="w-full rounded-lg" />
                      <button type="button" onClick={removeVideo} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"><X className="h-3 w-3" /></button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center"><VideoIcon className="h-10 w-10 text-gray-400 mb-2" /><span className="text-gray-600 dark:text-gray-400 text-sm">Add Video (Max 5MB)</span></div>
                  )}
                  <button type="button" onClick={() => videoInputRef.current?.click()} className="mt-3 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 text-sm">
                    {videoPreview ? "Change" : "Select Video"}
                  </button>
                  <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-center gap-4 pt-4">
                <button type="button" onClick={() => router.back()} className="px-8 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300">Cancel</button>
                <button type="button" onClick={handlePreviewClick} className="px-8 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600">Preview & Post</button>
              </div>

              {showErrorBanner && (
                <div className="mt-4 bg-red-500 text-white rounded-lg p-4 flex items-center gap-3">
                  <Info className="h-5 w-5" /><p className="text-sm font-medium">Please fill all required fields</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16">
              <Package className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Drafts</h3>
              <p className="text-gray-600 dark:text-gray-400">Your saved drafts will appear here</p>
            </div>
          )}
        </div>

        {/* Preview Modal */}
        {isPreviewOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end">
            <div className="bg-white dark:bg-gray-800 h-full w-full sm:w-[450px] overflow-y-auto shadow-xl">
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Preview</h2>
                <button onClick={() => setIsPreviewOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="h-6 w-6 text-gray-600 dark:text-gray-400" /></button>
              </div>
              <div className="p-4 space-y-4">
                {photoPreviews.length > 0 && (
                  <div className="aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                    <img src={photoPreviews[0]} alt="Cover" className="w-full h-full object-cover" />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{formData.title}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-2xl font-bold text-red-500">{selectedCategory === "free" ? "FREE" : `$${parseFloat(formData.price.replace(/[^0-9.]/g, "") || "0").toLocaleString()}`}</span>
                    {formData.isNegotiable && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">Negotiable</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedCategory && <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">{getCategoryById(selectedCategory)?.icon} {getCategoryById(selectedCategory)?.name}</span>}
                  {selectedSubcategory && <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">{selectedSubcategory}</span>}
                  {formData.condition && <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">{CONDITION_OPTIONS.find(c => c.value === formData.condition)?.label}</span>}
                </div>
                {/* Category-specific preview fields */}
                {Object.keys(categoryFields).length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Details</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(categoryFields).filter(([_, v]) => v).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                          <span className="ml-1 text-gray-900 dark:text-white">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Description</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{formData.description}</p>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{formData.location}</span>
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="w-full px-6 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50">
                    {isSubmitting ? "Posting..." : "Post Ad"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sell It For Me Modal */}
        {isSellItForMeModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={declineSellItForMe}>
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-sm w-full shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🤝</span>
                  <div>
                    <h3 className="text-base font-bold text-white">Sell It For Me</h3>
                    <p className="text-red-100 text-xs">Premium Selling Service</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1.5">How it works:</h4>
                  <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                    <li className="flex items-start gap-1.5">
                      <span className="text-green-500">✓</span>
                      <span>Buyers contact <strong>TaskZing via WhatsApp</strong></span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-green-500">✓</span>
                      <span>We chat with buyers <strong>on your behalf</strong></span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-green-500">✓</span>
                      <span><strong>Schedule meetings</strong> between you & buyers</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-green-500">✓</span>
                      <span>Until you <strong>mark ad as sold</strong></span>
                    </li>
                  </ul>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-amber-800 dark:text-amber-300">Service Fee</span>
                    <span className="text-xl font-bold text-amber-600 dark:text-amber-400">${calculateSellItForMeFee()} {currency}</span>
                  </div>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">Based on product price</p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-2.5">
                  <p className="text-[10px] text-blue-700 dark:text-blue-300">
                    <strong>Note:</strong> Fee charged immediately when posting. Payment from your saved card.
                  </p>
                </div>

                <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
                  By enabling, you agree to our Terms of Service.
                </p>
              </div>

              {/* Actions */}
              <div className="px-4 pb-4 flex gap-2">
                <button
                  type="button"
                  onClick={declineSellItForMe}
                  className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  No Thanks
                </button>
                <button
                  type="button"
                  onClick={acceptSellItForMe}
                  className="flex-1 px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                >
                  Enable
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feature Ad Modal */}
        {isFeatureAdModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={declineFeatureAd}>
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-sm w-full shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⭐</span>
                  <div>
                    <h3 className="text-base font-bold text-white">Feature Your Ad</h3>
                    <p className="text-amber-100 text-xs">5x More Visibility</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1.5">What you get:</h4>
                  <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-500">⭐</span>
                      <span><strong>5x more buyers</strong> will see your ad</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-500">⭐</span>
                      <span>Appears at <strong>top of search results</strong></span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-500">⭐</span>
                      <span><strong>Special badge</strong> highlights your ad</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-500">⭐</span>
                      <span>Featured for <strong>7 days</strong></span>
                    </li>
                  </ul>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-amber-800 dark:text-amber-300">Feature Fee</span>
                    <span className="text-xl font-bold text-amber-600 dark:text-amber-400">$10 {currency}</span>
                  </div>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">One-time payment for 7 days</p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-2.5">
                  <p className="text-[10px] text-blue-700 dark:text-blue-300">
                    <strong>Note:</strong> Fee charged immediately when posting. Payment from your saved card.
                  </p>
                </div>

                <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
                  By enabling, you agree to our Terms of Service.
                </p>
              </div>

              {/* Actions */}
              <div className="px-4 pb-4 flex gap-2">
                <button
                  type="button"
                  onClick={declineFeatureAd}
                  className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  No Thanks
                </button>
                <button
                  type="button"
                  onClick={acceptFeatureAd}
                  className="flex-1 px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
                >
                  Feature Ad
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
