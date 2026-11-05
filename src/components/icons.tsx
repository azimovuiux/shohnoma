/**
 * iconsax-react ikonlari React 19 da defaultProps ishlamagani uchun rangsiz chiqadi.
 * Shu yerda color="currentColor", variant="Linear" standart qiymatlar bilan o‘raymiz.
 */
import * as I from "iconsax-react";
import type { IconProps } from "iconsax-react";

const wrap = (C: I.Icon) => {
  const W = ({ color = "currentColor", variant = "Linear", size = 18, ...rest }: IconProps) => (
    <C color={color} variant={variant} size={size} aria-hidden {...rest} />
  );
  return W;
};

export const Add = wrap(I.Add);
export const ArrowDown = wrap(I.ArrowDown);
export const ArrowDown2 = wrap(I.ArrowDown2);
export const ArrowLeft = wrap(I.ArrowLeft);
export const ArrowRight = wrap(I.ArrowRight);
export const Brush = wrap(I.Brush);
export const Calendar = wrap(I.Calendar);
export const Call = wrap(I.Call);
export const Card = wrap(I.Card);
export const Clock = wrap(I.Clock);
export const CloseCircle = wrap(I.CloseCircle);
export const Copy = wrap(I.Copy);
export const Crown1 = wrap(I.Crown1);
export const DocumentText = wrap(I.DocumentText);
export const Edit = wrap(I.Edit);
export const Export = wrap(I.Export);
export const Eye = wrap(I.Eye);
export const Filter = wrap(I.Filter);
export const Gallery = wrap(I.Gallery);
export const Grid2 = wrap(I.Grid2);
export const HambergerMenu = wrap(I.HambergerMenu);
export const Heart = wrap(I.Heart);
export const Home2 = wrap(I.Home2);
export const Instagram = wrap(I.Instagram);
export const Link2 = wrap(I.Link2);
export const Location = wrap(I.Location);
export const Lovely = wrap(I.Lovely);
export const Messages = wrap(I.Messages);
export const Minus = wrap(I.Minus);
export const Mobile = wrap(I.Mobile);
export const MoneySend = wrap(I.MoneySend);
export const Monitor = wrap(I.Monitor);
export const Music = wrap(I.Music);
export const Profile2User = wrap(I.Profile2User);
export const Receipt2 = wrap(I.Receipt2);
export const SearchNormal1 = wrap(I.SearchNormal1);
export const Send2 = wrap(I.Send2);
export const ShieldTick = wrap(I.ShieldTick);
export const Sms = wrap(I.Sms);
export const Star1 = wrap(I.Star1);
export const Tag = wrap(I.Tag);
export const TickCircle = wrap(I.TickCircle);
export const Timer1 = wrap(I.Timer1);
export const UserTick = wrap(I.UserTick);
export const Wallet = wrap(I.Wallet);
export const Whatsapp = wrap(I.Whatsapp);
export const MonitorMobbile = wrap(I.MonitorMobbile);
export const PlayCircle = wrap(I.PlayCircle);
export const Cake = wrap(I.Cake);
export const WalletCheck = wrap(I.WalletCheck);
export const CardPos = wrap(I.CardPos);
export const MessageText = wrap(I.MessageText);
export const Colorfilter = wrap(I.Colorfilter);
export const AddCircle = wrap(I.AddCircle);
