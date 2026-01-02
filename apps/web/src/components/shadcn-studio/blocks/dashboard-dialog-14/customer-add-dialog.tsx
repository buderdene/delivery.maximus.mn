'use client'

import { useState, type ReactNode } from 'react'
import { Building2, MapPin, Phone, Mail, User, FileText } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

import { cn } from '@/lib/utils'

type Props = {
  trigger: ReactNode
  defaultOpen?: boolean
  className?: string
  onSubmit?: (data: CustomerFormData) => void
}

export type CustomerFormData = {
  name: string
  phone: string
  email: string
  city: string
  district: string
  street1: string
  street2: string
  registrationNumber: string
  contactPerson: string
  notes: string
  type: 'company' | 'individual'
}

const CustomerAddDialog = ({ defaultOpen = false, trigger, className, onSubmit }: Props) => {
  const [open, setOpen] = useState(defaultOpen)
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    phone: '',
    email: '',
    city: '',
    district: '',
    street1: '',
    street2: '',
    registrationNumber: '',
    contactPerson: '',
    notes: '',
    type: 'company'
  })

  const handleInputChange = (field: keyof CustomerFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit(formData)
    }
    setOpen(false)
    // Reset form
    setFormData({
      name: '',
      phone: '',
      email: '',
      city: '',
      district: '',
      street1: '',
      street2: '',
      registrationNumber: '',
      contactPerson: '',
      notes: '',
      type: 'company'
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={() => setOpen(true)}>
        {trigger}
      </DialogTrigger>
      <DialogContent className={cn('sm:max-w-[600px] max-h-[90vh] overflow-y-auto', className)}>
        <DialogHeader className='flex-row items-center gap-4'>
          <Avatar className='size-11 rounded-md'>
            <AvatarFallback className='shrink-0 rounded-md border bg-primary/10'>
              <Building2 className='size-6 text-primary' />
            </AvatarFallback>
          </Avatar>
          <div className='space-y-1'>
            <DialogTitle className='m-0 text-lg'>Шинэ харилцагч</DialogTitle>
            <DialogDescription>Харилцагчийн мэдээллийг оруулна уу</DialogDescription>
          </div>
        </DialogHeader>

        <div className='grid gap-6 py-4'>
          {/* Customer Type */}
          <div className='grid gap-2'>
            <Label htmlFor='type'>Төрөл</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value: 'company' | 'individual') => handleInputChange('type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder='Төрөл сонгох' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='company'>Байгууллага</SelectItem>
                <SelectItem value='individual'>Хувь хүн</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Company/Customer Name */}
          <div className='grid gap-2'>
            <Label htmlFor='name'>
              <div className='flex items-center gap-2'>
                <Building2 className='size-4' />
                {formData.type === 'company' ? 'Байгууллагын нэр' : 'Нэр'} *
              </div>
            </Label>
            <Input
              id='name'
              placeholder={formData.type === 'company' ? 'Байгууллагын нэрийг оруулна уу' : 'Нэрийг оруулна уу'}
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
            />
          </div>

          {/* Registration Number (for companies) */}
          {formData.type === 'company' && (
            <div className='grid gap-2'>
              <Label htmlFor='registrationNumber'>
                <div className='flex items-center gap-2'>
                  <FileText className='size-4' />
                  Регистрийн дугаар
                </div>
              </Label>
              <Input
                id='registrationNumber'
                placeholder='1234567'
                value={formData.registrationNumber}
                onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
              />
            </div>
          )}

          {/* Phone */}
          <div className='grid gap-2'>
            <Label htmlFor='phone'>
              <div className='flex items-center gap-2'>
                <Phone className='size-4' />
                Утасны дугаар *
              </div>
            </Label>
            <Input
              id='phone'
              type='tel'
              placeholder='99001122'
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
            />
          </div>

          {/* Email */}
          <div className='grid gap-2'>
            <Label htmlFor='email'>
              <div className='flex items-center gap-2'>
                <Mail className='size-4' />
                И-мэйл
              </div>
            </Label>
            <Input
              id='email'
              type='email'
              placeholder='example@company.mn'
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
            />
          </div>

          {/* Contact Person (for companies) */}
          {formData.type === 'company' && (
            <div className='grid gap-2'>
              <Label htmlFor='contactPerson'>
                <div className='flex items-center gap-2'>
                  <User className='size-4' />
                  Холбоо барих хүн
                </div>
              </Label>
              <Input
                id='contactPerson'
                placeholder='Холбоо барих хүний нэр'
                value={formData.contactPerson}
                onChange={(e) => handleInputChange('contactPerson', e.target.value)}
              />
            </div>
          )}

          {/* Address Section */}
          <div className='space-y-4'>
            <Label className='flex items-center gap-2 text-base font-medium'>
              <MapPin className='size-4' />
              Хаяг
            </Label>
            
            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='city'>Хот/Аймаг</Label>
                <Input
                  id='city'
                  placeholder='Улаанбаатар'
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='district'>Дүүрэг/Сум</Label>
                <Input
                  id='district'
                  placeholder='Баянзүрх'
                  value={formData.district}
                  onChange={(e) => handleInputChange('district', e.target.value)}
                />
              </div>
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='street1'>Гудамж 1</Label>
              <Input
                id='street1'
                placeholder='13-р хороо, Их тойруу'
                value={formData.street1}
                onChange={(e) => handleInputChange('street1', e.target.value)}
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='street2'>Гудамж 2 (Нэмэлт)</Label>
              <Input
                id='street2'
                placeholder='Централ тауэр, 5 давхар'
                value={formData.street2}
                onChange={(e) => handleInputChange('street2', e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className='grid gap-2'>
            <Label htmlFor='notes'>Тэмдэглэл</Label>
            <Textarea
              id='notes'
              placeholder='Нэмэлт мэдээлэл...'
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className='gap-4 max-sm:flex-col sm:justify-end'>
          <DialogClose asChild>
            <Button variant='outline' size='lg'>
              Цуцлах
            </Button>
          </DialogClose>
          <Button 
            size='lg' 
            onClick={handleSubmit}
            disabled={!formData.name || !formData.phone}
          >
            Хадгалах
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CustomerAddDialog
