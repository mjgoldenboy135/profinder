"""Mock professional profiles used to populate the app for demos.

Shared by the data migration (0005) and the `seed_profiles` management command
so the two never drift apart.
"""
import hashlib
import io

DEMO_PASSWORD = 'Profinder123!'
DEMO_EMAIL_DOMAIN = '@profinder.demo'

# 20 professionals across different fields and cities (with real coordinates so
# they appear on the map).
PROFILES = [
    {"full_name": "Aisha Khan", "profession": "Software Engineer", "city": "San Francisco, CA", "lat": 37.7749, "lng": -122.4194,
     "education": "B.Sc. Computer Science, UC Berkeley", "years": 7, "interests": ["Python", "Distributed Systems", "Open Source"],
     "bio": "Backend engineer who loves building reliable APIs and mentoring junior devs.",
     "details": "7 years across fintech and SaaS. Specializes in Python, Go, and cloud infrastructure on AWS."},
    {"full_name": "Daniel Okafor", "profession": "Physician", "city": "New York, NY", "lat": 40.7128, "lng": -74.0060,
     "education": "M.D., Johns Hopkins University", "years": 12, "interests": ["Cardiology", "Public Health", "Running"],
     "bio": "Cardiologist focused on preventive care and community health.",
     "details": "Board-certified cardiologist with 12 years of clinical experience at leading hospitals."},
    {"full_name": "Sofia Rossi", "profession": "Lawyer", "city": "London, UK", "lat": 51.5074, "lng": -0.1278,
     "education": "LL.M., London School of Economics", "years": 9, "interests": ["Corporate Law", "Arbitration", "Chess"],
     "bio": "Corporate lawyer advising startups and scale-ups on funding and M&A.",
     "details": "Specializes in corporate and commercial law, cross-border transactions, and venture financing."},
    {"full_name": "Liam Chen", "profession": "Graphic Designer", "city": "Toronto, ON", "lat": 43.6532, "lng": -79.3832,
     "education": "BFA Visual Communication, OCAD University", "years": 6, "interests": ["Branding", "Typography", "Illustration"],
     "bio": "Brand and identity designer helping companies tell their story visually.",
     "details": "Freelance designer crafting brand identities, packaging, and design systems for global clients."},
    {"full_name": "Emma Bauer", "profession": "Marketing Manager", "city": "Berlin, DE", "lat": 52.5200, "lng": 13.4050,
     "education": "MBA, ESMT Berlin", "years": 8, "interests": ["Growth", "SEO", "Content Strategy"],
     "bio": "Growth marketer with a passion for data-driven campaigns.",
     "details": "Leads full-funnel marketing for B2B SaaS; expert in demand generation and analytics."},
    {"full_name": "Noah Williams", "profession": "Data Scientist", "city": "Sydney, AU", "lat": -33.8688, "lng": 151.2093,
     "education": "M.Sc. Statistics, University of Sydney", "years": 5, "interests": ["Machine Learning", "NLP", "Surfing"],
     "bio": "Turning messy data into product decisions.",
     "details": "Builds ML models for recommendation and forecasting; fluent in Python, PyTorch, and SQL."},
    {"full_name": "Mei Lin", "profession": "Architect", "city": "Singapore", "lat": 1.3521, "lng": 103.8198,
     "education": "M.Arch, National University of Singapore", "years": 10, "interests": ["Sustainable Design", "Urbanism", "Sketching"],
     "bio": "Designing sustainable spaces for dense urban environments.",
     "details": "Registered architect focused on green buildings and mixed-use developments across Asia."},
    {"full_name": "Omar Haddad", "profession": "Civil Engineer", "city": "Dubai, UAE", "lat": 25.2048, "lng": 55.2708,
     "education": "B.Eng. Civil Engineering, American University of Sharjah", "years": 11, "interests": ["Structures", "Project Management", "Cycling"],
     "bio": "Delivering large-scale infrastructure projects on time.",
     "details": "Site and structural engineer with experience on high-rise and transport megaprojects."},
    {"full_name": "Camille Laurent", "profession": "UX Designer", "city": "Paris, FR", "lat": 48.8566, "lng": 2.3522,
     "education": "M.A. Interaction Design, Strate School of Design", "years": 6, "interests": ["User Research", "Prototyping", "Photography"],
     "bio": "Designing intuitive products people love to use.",
     "details": "End-to-end UX designer: research, wireframes, prototypes, and usability testing."},
    {"full_name": "Kenji Tanaka", "profession": "Product Manager", "city": "Tokyo, JP", "lat": 35.6762, "lng": 139.6503,
     "education": "B.A. Economics, University of Tokyo", "years": 9, "interests": ["Strategy", "Fintech", "Cooking"],
     "bio": "Building products at the intersection of business and technology.",
     "details": "PM shipping consumer fintech products; strong in roadmapping and cross-functional leadership."},
    {"full_name": "Isabella Martinez", "profession": "Photographer", "city": "Los Angeles, CA", "lat": 34.0522, "lng": -118.2437,
     "education": "BFA Photography, Art Center College of Design", "years": 8, "interests": ["Portraits", "Travel", "Film"],
     "bio": "Portrait and editorial photographer capturing authentic moments.",
     "details": "Commercial and editorial photographer for brands, magazines, and personal branding shoots."},
    {"full_name": "James Sullivan", "profession": "Accountant", "city": "Chicago, IL", "lat": 41.8781, "lng": -87.6298,
     "education": "B.Sc. Accounting, University of Illinois", "years": 14, "interests": ["Tax", "Auditing", "Golf"],
     "bio": "CPA helping small businesses stay financially healthy.",
     "details": "Certified Public Accountant specializing in tax planning, audit, and financial advisory."},
    {"full_name": "Julia de Vries", "profession": "Dentist", "city": "Amsterdam, NL", "lat": 52.3676, "lng": 4.9041,
     "education": "DDS, University of Amsterdam", "years": 10, "interests": ["Orthodontics", "Wellness", "Cycling"],
     "bio": "Gentle, patient-first dental care.",
     "details": "General and cosmetic dentist running a modern practice focused on preventive care."},
    {"full_name": "Marc Puig", "profession": "Chef", "city": "Barcelona, ES", "lat": 41.3851, "lng": 2.1734,
     "education": "Culinary Arts Diploma, Hofmann Barcelona", "years": 13, "interests": ["Mediterranean Cuisine", "Wine", "Foraging"],
     "bio": "Chef celebrating seasonal Mediterranean ingredients.",
     "details": "Head chef with fine-dining experience; passionate about local, seasonal, sustainable food."},
    {"full_name": "Priya Nair", "profession": "Pharmacist", "city": "Mumbai, IN", "lat": 19.0760, "lng": 72.8777,
     "education": "Pharm.D, University of Mumbai", "years": 7, "interests": ["Clinical Pharmacy", "Patient Care", "Yoga"],
     "bio": "Clinical pharmacist improving medication safety.",
     "details": "Hospital pharmacist focused on clinical pharmacology and patient counseling."},
    {"full_name": "Lucas Almeida", "profession": "Mechanical Engineer", "city": "São Paulo, BR", "lat": -23.5505, "lng": -46.6333,
     "education": "B.Eng. Mechanical Engineering, USP", "years": 8, "interests": ["Robotics", "CAD", "Football"],
     "bio": "Designing machines that make life easier.",
     "details": "Mechanical engineer in manufacturing and automation; skilled in CAD, FEA, and product design."},
    {"full_name": "Grace Thompson", "profession": "Registered Nurse", "city": "Austin, TX", "lat": 30.2672, "lng": -97.7431,
     "education": "BSN, University of Texas at Austin", "years": 9, "interests": ["Emergency Care", "Wellness", "Hiking"],
     "bio": "ER nurse who cares deeply about every patient.",
     "details": "Emergency department RN with a decade of acute and critical care experience."},
    {"full_name": "David Park", "profession": "Financial Analyst", "city": "Seattle, WA", "lat": 47.6062, "lng": -122.3321,
     "education": "B.Sc. Finance, University of Washington", "years": 6, "interests": ["Equity Research", "Investing", "Chess"],
     "bio": "Helping companies make smarter capital decisions.",
     "details": "CFA candidate doing valuation, financial modeling, and equity research for tech firms."},
    {"full_name": "Hannah Cohen", "profession": "Teacher", "city": "Boston, MA", "lat": 42.3601, "lng": -71.0589,
     "education": "M.Ed., Boston University", "years": 11, "interests": ["STEM Education", "Reading", "Mentoring"],
     "bio": "High school science teacher inspiring the next generation.",
     "details": "Physics and chemistry teacher passionate about hands-on, inquiry-based learning."},
    {"full_name": "Thabo Nkosi", "profession": "Electrician", "city": "Cape Town, ZA", "lat": -33.9249, "lng": 18.4241,
     "education": "Electrical Trade Certificate, CPUT", "years": 12, "interests": ["Solar Energy", "Home Automation", "Music"],
     "bio": "Licensed electrician specializing in solar installations.",
     "details": "Master electrician for residential and commercial jobs, focused on renewable energy systems."},
]


def build_avatar(full_name):
    """Return JPEG bytes for a simple colored avatar with initials."""
    from PIL import Image, ImageDraw, ImageFont

    seed = int(hashlib.md5(full_name.encode()).hexdigest(), 16)
    palette = [
        (37, 99, 235), (220, 38, 38), (5, 150, 105), (217, 119, 6),
        (124, 58, 237), (219, 39, 119), (2, 132, 199), (202, 138, 4),
        (15, 118, 110), (190, 24, 93),
    ]
    color = palette[seed % len(palette)]
    img = Image.new('RGB', (400, 400), color)
    draw = ImageDraw.Draw(img)
    initials = ''.join(part[0] for part in full_name.split()[:2]).upper() or '?'

    font = None
    for path in (
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        'DejaVuSans-Bold.ttf',
    ):
        try:
            font = ImageFont.truetype(path, 190)
            break
        except Exception:
            continue
    if font is None:
        font = ImageFont.load_default()

    try:
        bbox = draw.textbbox((0, 0), initials, font=font)
        w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text(((400 - w) / 2 - bbox[0], (400 - h) / 2 - bbox[1]),
                  initials, fill='white', font=font)
    except Exception:
        pass

    buffer = io.BytesIO()
    img.save(buffer, format='JPEG', quality=85)
    return buffer.getvalue()


def profile_email(full_name):
    slug = full_name.lower().replace(' ', '.')
    return f'{slug}{DEMO_EMAIL_DOMAIN}'


def seed_profiles(User, UserProfile, hashed_password, stdout=None):
    """Idempotently create the demo users + profiles. Returns count created."""
    created = 0
    for p in PROFILES:
        email = profile_email(p['full_name'])
        if User.objects.filter(email__iexact=email).exists():
            continue
        user = User.objects.create(
            email=email, username=email, password=hashed_password,
            email_verified=True, is_active=True,
        )
        UserProfile.objects.create(
            user=user,
            full_name=p['full_name'],
            profession=p['profession'],
            education=p.get('education', ''),
            professional_details=p.get('details', ''),
            years_of_experience=p.get('years'),
            linkedin_profile_url='',
            phone_number='',
            bio=p.get('bio', ''),
            interests=p.get('interests', []),
            profile_picture_data=build_avatar(p['full_name']),
            profile_picture_content_type='image/jpeg',
            lat=p['lat'], lng=p['lng'], address=p['city'],
            is_online=True, location_visibility='public', show_contact=True,
        )
        created += 1
        if stdout:
            stdout.write(f'  + {p["full_name"]} — {p["profession"]} ({p["city"]})')
    return created
