export type InstitutionType = "university" | "college" | "tti";

export const INSTITUTION_TYPE_LABELS: Record<InstitutionType, string> = {
  university: "University",
  college: "College",
  tti: "Technical Training Institute",
};

export const INSTITUTIONS_BY_TYPE: Record<InstitutionType, string[]> = {
  university: [
    "University of Nairobi",
    "Kenyatta University",
    "JKUAT",
    "Strathmore University",
    "Moi University",
    "Egerton University",
    "Maseno University",
    "Technical University of Kenya",
    "Multimedia University of Kenya",
    "USIU-Africa",
    "Mount Kenya University",
    "Daystar University",
    "KCA University",
    "Pwani University",
    "Dedan Kimathi University of Technology",
  ],
  college: [
    "Kenya Medical Training College",
    "Kenya Institute of Mass Communication",
    "Railway Training Institute",
    "Co-operative University of Kenya",
    "Kenya School of Law",
    "Kenya Utalii College",
  ],
  tti: [
    "Nairobi Technical Training Institute",
    "Thika Technical Training Institute",
    "Kabete National Polytechnic",
    "Kisumu National Polytechnic",
    "Eldoret National Polytechnic",
    "Meru National Polytechnic",
  ],
};
