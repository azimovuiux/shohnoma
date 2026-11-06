import type { InvitationData } from "@/components/invitation/types";
import type { FlowOrder } from "./types";

export function toInvitationData(o: FlowOrder): InvitationData {
  return {
    slug: o.slug,
    ceremony: o.ceremony,
    personA: o.personA,
    personB: o.personB || null,
    date: o.day && o.time ? `${o.day}T${o.time}` : o.day ? `${o.day}T18:00` : "",
    venueName: o.venueName,
    address: o.address,
    mapUrl: o.mapUrl || null,
    message: o.message || null,
    program: o.program,
    photos: o.photos,
    rsvpEnabled: o.rsvpEnabled,
    rsvpDeadline: o.rsvpDeadline,
    musicEnabled: o.musicEnabled,
    musicTrack: o.musicTrack,
    extra: o.extra,
  };
}
